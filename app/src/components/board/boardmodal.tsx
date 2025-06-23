"use client"

import React, { useEffect, useState, useRef } from "react"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Input,
  Radio,
  RadioGroup,
  Card,
  Button,
  Select,
  SelectItem,
  Avatar,
  AvatarGroup,
  Tooltip,
} from "@heroui/react"
import { IoAdd, IoCloseOutline } from "react-icons/io5"
import { useParams } from "next/navigation"

import { BiSolidLock } from "react-icons/bi"
import {
  MdOutlinePublic,
  MdArrowForwardIos,
  MdArrowBackIos,
} from "react-icons/md"
import { useSession } from "next-auth/react"
import reactCSS from "reactcss"
import { SketchPicker } from "react-color"
import PropTypes from "prop-types"
import { showErrorToast, showSuccessToast } from "@/src/utils/toastUtils"
import { createTask, updateCategory, deleteCategory } from "@/server/category"
import {
  createboard,
  getAllUsers,
  getUserByEmail,
  updateBoard,
} from "@/server/board"
import { useGlobalSyncupContext } from "@/src/context/SyncUpStore"

interface Category {
  id?: number
  name: string
  color: string
}

const backgroundImages = [
  "/backgrounds/image1.avif",
  "/backgrounds/image2.avif",
  "/backgrounds/image3.jpg",
  "/backgrounds/image4.jpg",
  "/backgrounds/image5.jpg",
  "/backgrounds/image6.avif",
  "/backgrounds/image7.jpg",
  "/backgrounds/image8.jpg",
]
const defaultColor = "#8e78b6"
function AddBoardModal({ open, onClose, boardData }) {
  const excludedCategory = [
    { name: "Backlog", color: "#FF5733" },
    { name: "Todo", color: "#FFC300" },
    { name: "In Progress", color: "#33B5FF" },
    { name: "Done", color: "#28A745" },
    { name: "Release", color: "#8B572A" },
  ]
  const [categories, setCategories] = useState([""])
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [categoryPickerOpen, setCategoryPickerOpen] = useState<boolean[]>([])
  const [categoryColors, setCategoryColors] = useState([""])
  const [catgeoryId, setCatgeoryId] = useState([""])
  const [categoryErrors, setCategoryErrors] = useState<string[]>([])
  const board = useParams()
  const { setudpateboard, setcreatenotification } = useGlobalSyncupContext()
  const [boardName, setBoardName] = useState("")
  const [visibility, setVisibility] = useState(
    board.organization === "Ptask" ? "PRIVATE" : "PUBLIC",
  )
  const [error, setError] = useState("")
  const [selectedBackground, setSelectedBackground] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [allUsers, setAllUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const { data: session, status } = useSession()
  const [curentuser, setUser] = useState([])
  const userName = session?.user?.name
  const colorPickerRefs = useRef([])
  const handlePickerClose = (index) => {
    const updatedPickerOpen = [...categoryPickerOpen]
    updatedPickerOpen[index] = false
    setCategoryPickerOpen(updatedPickerOpen)
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getAllUsers(board.organization)
        if (!users) return
        setAllUsers(users)
        if (status === "authenticated" && session && open && !boardData) {
          const userId = await getUserByEmail(session.user.email)
          setUser(userId)
        }
      } catch (errorOfUser) {
        showErrorToast("Error fetching users")
      }
    }
    if (open) {
      fetchUsers()
    }
  }, [open])
  useEffect(() => {
    setSelectedBackground(backgroundImages[currentIndex + 1])
  }, [currentIndex, backgroundImages])
  useEffect(() => {
    if (boardData) {
      setBoardName(boardData?.name || "")
      setVisibility(boardData?.visibility || "PUBLIC")
      setSelectedBackground(boardData.background || "")
      setCurrentIndex(
        backgroundImages.findIndex((img) => img === boardData.background) || 0,
      )
      const sortedTasks = boardData.tasks.slice().sort((a, b) => a.id - b.id)
      const defaultCats = []
      const customCats = []

      sortedTasks.forEach((task) => {
        const isDefaultCategory = excludedCategory.some(
          (cat) => cat.name.toLowerCase() === task.category.toLowerCase(),
        )

        if (isDefaultCategory) {
          defaultCats.push(task)
        } else {
          customCats.push({
            id: task.id,
            name: task.category,
            color: task.color,
          })
        }
      })
      setCategories(defaultCats.map((task) => task.category))
      setCategoryColors(defaultCats.map((task) => task.color))
      setCatgeoryId(defaultCats.map((task) => task.id))

      setCustomCategories(customCats)
      setCategoryPickerOpen(new Array(customCats.length).fill(false))
      setCategoryErrors(new Array(customCats.length).fill(""))

      setSelectedUsers(
        boardData?.users?.map((user) => user.id.toString()) || [],
      )
    } else {
      setBoardName("")
      setVisibility(board.organization === "Ptask" ? "PRIVATE" : "PUBLIC")
      setSelectedBackground(backgroundImages[currentIndex + 1])
      setCurrentIndex(0)
      const defaultCategories = excludedCategory.map((cat) => cat.name)
      const defaultColors = excludedCategory.map((cat) => cat.color)
      setCategories(defaultCategories)
      setCategoryColors(defaultColors)
      setCatgeoryId(defaultCategories.map(() => ""))
      setCategoryErrors(defaultCategories.map(() => ""))
      setCustomCategories([])
      setCategoryPickerOpen([])
      setCategoryErrors([])

      setSelectedUsers([])
    }
  }, [boardData, open])
  useEffect(() => {
    const handleClickOutside = (event) => {
      categoryPickerOpen.forEach((isOpen, index) => {
        if (isOpen && colorPickerRefs.current[index]) {
          const pickerElement = colorPickerRefs.current[index]
          if (pickerElement && !pickerElement.contains(event.target)) {
            handlePickerClose(index)
          }
        }
      })
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [categoryPickerOpen])
  const handleClose = () => {
    onClose()
    setError("")
    setBoardName("")
    setVisibility(board.organization === "Ptask" ? "PRIVATE" : "PUBLIC")
    setCurrentIndex(0)
    setSelectedUsers([])
    setCategories([""])
    setCategoryColors([""])
    setCatgeoryId([""])
    setCategoryErrors([])
  }
  const handleNext = () => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + 1
      return nextIndex >= backgroundImages.length ? 0 : nextIndex
    })
  }
  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? backgroundImages.length - 1 : prevIndex - 1,
    )
  }
  const handleInputChange = (e) => {
    const { value } = e.target
    const specialCharacters = /[!@#$%^&*(),.?":{}|<>]/
    if (specialCharacters.test(value)) {
      setError("Special characters are not allowed.")
    } else {
      setBoardName(value)
      setError("")
    }
  }
  const handleUserChange = (selectedItems) => {
    const selectedKeys = Array.from(selectedItems)
    setSelectedUsers(selectedKeys)
    if (
      selectedKeys.length &&
      error === "No users assigned to the private board."
    ) {
      setError("")
    }
  }
  const handleVisibilityChange = (e) => {
    const newVisibility = e.target.value
    setError("")

    if (newVisibility === "PRIVATE") {
      setSelectedUsers([])
    }
    setVisibility(newVisibility)
  }
  const handleCreateOrUpdateBoard = async () => {
    const hasInvalidCategories = customCategories.some((category) => {
      const isDefaultName = excludedCategory.some(
        (cat) => cat.name.toLowerCase() === category.name.toLowerCase(),
      )
      return isDefaultName || !category.name.trim()
    })

    if (hasInvalidCategories) {
      setError("Please fix category names before saving.")
      showErrorToast("Cannot use default category names or empty names")
      return
    }

    const trimmedName = boardName.trim()
    if (!trimmedName) {
      setError("Board name is required.")
      return
    }

    if (visibility === "PRIVATE" && selectedUsers.length === 0) {
      setError("No users assigned to the private board.")
      return
    }

    const updatedErrors = categories.map((category) => {
      const trimmedCategory = category.trim()
      if (trimmedCategory === "") {
        return "Category name is required."
      }
      return ""
    })
    setCategoryErrors(updatedErrors)

    const nonDefaultCategories = categories.filter(
      (category) =>
        !excludedCategory.some(
          (defaultCat) =>
            defaultCat.name.toLowerCase() === category.trim().toLowerCase(),
        ),
    )

    const boarduser =
      visibility === "PRIVATE"
        ? selectedUsers.map((id) => parseInt(id, 10))
        : allUsers.map((user) => user.id)
    setError("")
    const hasErrors = customCategories.some((category, index) => {
      if (!category.name.trim()) {
        setCategoryErrors((prev) => {
          const newErrors = [...prev]
          newErrors[index] = "Category name is required"
          return newErrors
        })
        return true
      }
      return false
    })

    if (hasErrors) {
      setError("Please fix category names before saving.")
      return
    }

    try {
      if (boardData) {
        const previousUserIds = boardData.users.map((user) => user.id)
        const usersToUnassign = previousUserIds.filter(
          (id) => !selectedUsers.includes(id.toString()),
        )
        const usersToAssign = selectedUsers.filter(
          (id) => !previousUserIds.includes(parseInt(id, 10)),
        )
        await updateBoard(
          boardData.id,
          boardName,
          selectedBackground,
          visibility,
          usersToAssign.map((id) => ({ id: parseInt(id, 10) })),
          usersToUnassign.map((id) => ({ id })),
          boarduser,
        )
        const updateTasksPromises = catgeoryId.map(async (taskId) => {
          const task = boardData.tasks.find((tasks) => tasks.id === taskId)
          if (task) {
            const categoryIndex = catgeoryId.indexOf(task.id)
            if (categoryIndex !== -1) {
              const newCategoryName = categories[categoryIndex]
              const color = categoryColors[categoryIndex]
              await updateCategory(newCategoryName, taskId, color)
            }
          }
        })
        const newCategories = nonDefaultCategories.filter(
          (category) =>
            !boardData.tasks.some((task) => task.category === category),
        )

        const createCategoryPromises = newCategories.map(async (category) => {
          const color = categoryColors[categories.indexOf(category)]
          const result = await createTask(category, boardData.id, color)
          if (!result.success) {
            showErrorToast("Failed to create category")
          }
        })

        const removedCategories = boardData.tasks.filter(
          (task) => !catgeoryId.includes(task.id),
        )
        const deleteCategoryPromises = removedCategories.map(async (task) => {
          await deleteCategory(task.id)
        })

        await Promise.all([
          ...updateTasksPromises,
          ...createCategoryPromises,
          ...deleteCategoryPromises,
        ])

        await Promise.all(
          customCategories
            .filter((category) => !category.id)
            .map((category) =>
              createTask(category.name, boardData.id, category.color),
            ),
        )

        setudpateboard(true)
        setcreatenotification(false)
        setBoardName("")
        setVisibility(board.organization === "Ptask" ? "PRIVATE" : "PUBLIC")
        setCategories([""])
        setCategoryColors([""])
        setCatgeoryId([""])
        setCategoryErrors([])
        setSelectedUsers([])
        showSuccessToast("Board updated successfully")
      } else if (boardName !== "") {
        const boardId = await createboard(
          boardName,
          visibility,
          selectedBackground,
          boarduser,
          board.organization,
          userName,
        )
        setudpateboard(true)
        await Promise.all(
          nonDefaultCategories.map(async (category) => {
            const color = categoryColors[categories.indexOf(category)]
            await createTask(category, boardId, color)
          }),
        )
        await Promise.all(
          customCategories.map((category) =>
            createTask(category.name, boardId, category.color),
          ),
        )

        if (boardId) {
          showSuccessToast("Board created successfully")
        }
      }
      setBoardName("")
      setcreatenotification(false)
      setVisibility(board.organization === "Ptask" ? "PRIVATE" : "PUBLIC")
      setCategories([""])
      setCategoryColors([""])
      setCatgeoryId([""])
      setCategoryErrors([])
      setSelectedUsers([])
      if (boardName !== "") {
        handleClose()
      }
    } catch (errorOfBoard) {
      setError("Error creating/updating board.")
      showErrorToast("Error creating/updating board.")
    }
  }
  const handleCustomCategoryChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const newName = event.target.value
    const updatedCategories = [...customCategories]
    const updatedErrors = [...categoryErrors]
    updatedCategories[index] = {
      ...updatedCategories[index],
      name: newName,
    }
    if (
      excludedCategory.some(
        (cat) => cat.name.toLowerCase() === newName.toLowerCase(),
      )
    ) {
      updatedErrors[index] = "Cannot use a default category name"
    } else if (newName.trim() === "") {
      updatedErrors[index] = "Category name is required"
    } else {
      updatedErrors[index] = ""
    }
    setCustomCategories(updatedCategories)
    setCategoryErrors(updatedErrors)
  }
  const handleAddCategory = async () => {
    const newCategory: Category = {
      name: "",
      color: defaultColor,
    }

    setCustomCategories([...customCategories, newCategory])
    setCategoryPickerOpen([...categoryPickerOpen, false])
    setCategoryErrors([...categoryErrors, ""])
  }

  const handleDeleteCategory = async (index: number) => {
    try {
      const categoryToDelete = customCategories[index]

      if (categoryToDelete.id) {
        await deleteCategory(categoryToDelete.id)
      }

      const updatedCategories = customCategories.filter((_, i) => i !== index)
      const updatedErrors = categoryErrors.filter((_, i) => i !== index)
      const updatedPickerOpen = categoryPickerOpen.filter((_, i) => i !== index)

      setCustomCategories(updatedCategories)
      setCategoryErrors(updatedErrors)
      setCategoryPickerOpen(updatedPickerOpen)
      showSuccessToast("Category deleted successfully")
    } catch (error) {
      showErrorToast("Failed to delete category")
    }
  }

  const handleSwatchClick = (index) => {
    const updatedPickerOpen = [...categoryPickerOpen]
    updatedPickerOpen[index] = !updatedPickerOpen[index]
    setCategoryPickerOpen(updatedPickerOpen)
  }

  const handleCategoryColorChange = (index, newColor) => {
    const updatedCategories = [...customCategories]
    updatedCategories[index].color = newColor.hex
    setCustomCategories(updatedCategories)
  }

  const getCategoryStyles = (categoryColor) =>
    reactCSS({
      default: {
        color: {
          width: "36px",
          height: "14px",
          borderRadius: "2px",
          background: categoryColor || defaultColor,
        },
        swatch: {
          padding: "5px",
          background: "#fff",
          borderRadius: "1px",
          boxShadow: "0 0 0 1px rgba(0,0,0,.1)",
          display: "inline-block",
          cursor: "pointer",
          marginTop: "5px",
          position: "relative",
        },
        popover: {
          position: "absolute",
          zIndex: "2",
          transform: "translateY(10px)",
          top: "100%",
          right: "0",
        },
        cover: {
          position: "fixed",
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px",
        },
      },
    })
  const isNameError =
    error === "Board name is required." ||
    error === "Special characters are not allowed."
  return (
    <Modal
      shouldBlockScroll={false}
      isOpen={open}
      onClose={handleClose}
      placement="center"
      className="p-1 max-h-[80vh] md:no-scrollbar"
    >
      <ModalContent className="overflow-y-auto md:max-h-500 no-scrollbar">
        <ModalHeader>{boardData ? "Update Board" : "Create Board"}</ModalHeader>
        <ModalBody>
          <div>
            <Input
              isRequired
              label="BoardName"
              placeholder="Enter Board Name"
              size="sm"
              value={boardName}
              onChange={handleInputChange}
              errorMessage={isNameError ? error : ""}
              isInvalid={isNameError}
            />
          </div>
          {board.organization !== "Ptask" && (
            <RadioGroup
              label="Visibility"
              color="secondary"
              orientation="horizontal"
              value={visibility}
              onChange={handleVisibilityChange}
            >
              <Radio value="PUBLIC">
                <span
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <MdOutlinePublic size={20} />
                  Public
                </span>
              </Radio>
              <Radio value="PRIVATE">
                <span
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <BiSolidLock size={20} />
                  Private
                </span>
              </Radio>
            </RadioGroup>
          )}

          <>
            <div style={{ color: "#72727a" }}>Categories</div>
            {excludedCategory.map((defaultCat, index) => (
              <div className="flex items-center mb-2" key={`default-${index}`}>
                <Input
                  placeholder="Category Name"
                  variant="bordered"
                  size="sm"
                  value={defaultCat.name}
                  isDisabled
                  className="bg-gray-100"
                />
                <div className="ml-2">
                  <div
                    style={{
                      border: "1px solid #e5e5e5",
                      borderRadius: "2px",
                      padding: "4px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "14px",
                        background: defaultCat.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {customCategories.map((category, index) => (
              <div className="flex items-start" key={`custom-${index}`}>
                <div style={{ flex: 1, position: "relative" }}>
                  <Input
                    className="mt-1"
                    placeholder="Enter Category Name"
                    variant="bordered"
                    size="sm"
                    value={category.name}
                    onChange={(event) =>
                      handleCustomCategoryChange(event, index)
                    }
                    endContent={
                      <IoCloseOutline
                        size={25}
                        onClick={() => handleDeleteCategory(index)}
                        style={{ color: "grey", cursor: "pointer" }}
                      />
                    }
                  />
                  {categoryErrors[index] && (
                    <div className="text-pink-500 text-xs font-sans mt-1">
                      {categoryErrors[index]}
                    </div>
                  )}
                </div>
                <div className="ml-2 mt-1">
                  <div
                    role="button"
                    tabIndex={0}
                    style={getCategoryStyles(category.color).swatch}
                    onClick={() => handleSwatchClick(index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSwatchClick(index)
                      }
                    }}
                  >
                    <div style={getCategoryStyles(category.color).color} />
                  </div>
                  {categoryPickerOpen[index] && (
                    <div
                      ref={(el) => {
                        colorPickerRefs.current[index] = el
                      }}
                      style={getCategoryStyles(category.color).popover}
                    >
                      <SketchPicker
                        color={category.color}
                        onChange={(color) =>
                          handleCategoryColorChange(index, color)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Button
              className="w-9 mt-2"
              variant="flat"
              color="secondary"
              onClick={handleAddCategory}
            >
              <IoAdd size={25} />
            </Button>
          </>
          <div className="border-t border-gray-200 my-4" />
          {visibility === "PRIVATE" && board.organization !== "Ptask" && (
            <div>
              <span>Select users</span>
              <Select
                className="w-full "
                color="secondary"
                placeholder="Select users"
                aria-label="select"
                items={allUsers.map((user) => {
                  const isSelected = selectedUsers.includes(user.id)
                  return {
                    key: user.id.toString(),
                    ...user,
                    selected: isSelected,
                    value: user.id,
                  }
                })}
                selectionMode="multiple"
                {...(boardData?.visibility === "PRIVATE" && {
                  selectedKeys: selectedUsers.map((user) => user.toString()),
                })}
                onSelectionChange={handleUserChange}
                variant="bordered"
                size="sm"
                classNames={{
                  label: "group-data-[filled=true]:-translate-y-5",
                  trigger: "min-h-unit-16",
                  listboxWrapper: "max-h-[200px] overflow-y-auto",
                }}
                style={{ border: "none" }}
                renderValue={(items) => {
                  return (
                    <div className="flex flex-wrap gap-2 p-4">
                      <AvatarGroup
                        size="sm"
                        className="justify-start"
                        isBordered
                        max={2}
                      >
                        {items.map((item, index) => (
                          <Tooltip
                            key={index}
                            placement="bottom"
                            showArrow
                            size="sm"
                            content={
                              item.textValue?.length > 25 ? (
                                <>
                                  {item.textValue
                                    .match(/.{1,25}/g)
                                    .map((line, idx) => (
                                      <div key={idx}>{line}</div>
                                    ))}
                                </>
                              ) : (
                                item.textValue
                              )
                            }
                          >
                            <Avatar
                              size="sm"
                              name={item.textValue?.substring(0, 1)}
                            />
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    </div>
                  )
                }}
              >
                {allUsers.map((user) => (
                  <SelectItem
                    className={`max-h-32 overflow-auto no-scrollbar ${
                      user.id === curentuser ? "bg-[#e5d5f5]" : ""
                    }`}
                    key={user.id}
                    textValue={user.name}
                  >
                    <div className="flex-column">
                      <div className="flex gap-2 items-center">
                        <Avatar name={user.name.substring(0, 1)} size="sm" />
                        <div className="flex flex-col">
                          <span className="text-small">
                            {user.name.length > 15
                              ? `${user.name.substring(0, 20)}...`
                              : user.name}{" "}
                          </span>
                          <span className="text-default-500 text-tiny">
                            ({user.email})
                          </span>
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </Select>
              {error === "No users assigned to the private board." && (
                <div className="text-pink-500 p-2 ml-2 text-xs font-sans">
                  {error}
                </div>
              )}
            </div>
          )}
          <div
            style={{
              color: "#72727a",
            }}
          >
            Background
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              height: "100px",
              perspective: "1000px",
            }}
          >
            {backgroundImages
              .slice(currentIndex, currentIndex + 3)
              .map((bg, index) => (
                <Card
                  key={index}
                  style={{
                    width: "30%",
                    cursor: "pointer",
                    borderRadius: "4px",
                    overflow: "hidden",
                    position: "absolute",
                    left: `calc(25% - 17% + ${index * (25 + 2)}%)`,
                    transition: "transform 0.5s ease-in-out",
                    height: "80px",
                    transform:
                      index === 1 ? "translateZ(140px)" : "translateZ(0)",
                    zIndex: index === 1 ? 1 : 0,
                    backgroundImage: `url(${bg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ))}
            <Button
              color="secondary"
              onClick={handlePrev}
              style={{
                position: "absolute",
                top: "50%",
                left: "0",
                marginLeft: "20px",
                transform: "translateY(-50%)",
                zIndex: "2",
                background: "none",
                boxShadow: "none",
              }}
            >
              <MdArrowBackIos size={25} />
            </Button>
            <Button
              color="secondary"
              onClick={handleNext}
              style={{
                position: "absolute",
                top: "50%",
                marginRight: "16px",
                right: "0",
                transform: "translateY(-50%)",
                zIndex: "2",
                background: "none",
                boxShadow: "none",
              }}
            >
              <MdArrowForwardIos size={25} />
            </Button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "5px",
            }}
          >
            <Button variant="flat" color="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="flat"
              color="secondary"
              onClick={handleCreateOrUpdateBoard}
            >
              {boardData ? "Update" : "Create"}
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

AddBoardModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  boardData: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    visibility: PropTypes.string.isRequired,
    background: PropTypes.string.isRequired,
    categories: PropTypes.arrayOf(PropTypes.object.isRequired).isRequired,
    tasks: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        category: PropTypes.string.isRequired,
        color: PropTypes.string.isRequired,
      }),
    ).isRequired,
    users: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
      }).isRequired,
    ).isRequired,
  }).isRequired,
}

export default AddBoardModal
