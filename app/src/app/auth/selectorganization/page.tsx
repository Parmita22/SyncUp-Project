"use client"

import React, { useEffect, useState } from "react"
import { MdRotateLeft } from "react-icons/md"
import { useSession } from "next-auth/react"
import { Button, Card, CardBody } from "@heroui/react"
import { IoIosArrowForward } from "react-icons/io"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { showErrorToast } from "@/src/utils/toastUtils"
import CreateOrganization from "@/src/components/CreateOrganization"
import { fetchOrganizationName } from "@/server/organization"
import appConfig from "@/app.config"
import Loader from "@/src/components/Loader"

function selectorganization() {
  const { data: session } = useSession()
  const userEmail = session?.user?.email
  const [organizationname, setorganizationname] = useState([])
  const [orgOpenModal, setOrgOpenModal] = useState(false)
  const [load, setLoad] = useState(true)
  const [update, setupdate] = useState(false)
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        if (!userEmail) return
        const orgNameeee = await fetchOrganizationName(userEmail)
        setorganizationname(orgNameeee.organizations)
        setLoad(false)
        setupdate(false)
      } catch (error) {
        showErrorToast("Error fetching organization")
      }
    }
    fetchOrganization()
  }, [userEmail, update])
  const handleOrgCloseModal = () => {
    setOrgOpenModal(false)
  }

  const handleCardClick = (orgName) => {
    router.push(`/${orgName}/home`)
  }

  return (
    <div>
      {load ? (
        <Loader />
      ) : (
        <div
          className="flex justify-center items-center"
          style={{
            backgroundColor: resolvedTheme === "dark" ? "#1a1a1a" : "#eef2f6",
            minHeight: "100vh",
            width: "100vw",
          }}
        >
          <div
            className="md:w-1/4 p-6 rounded-md"
            style={{
              backgroundColor: resolvedTheme === "dark" ? "#333" : "#f9f9f9",
              color: resolvedTheme === "dark" ? "#fff" : "#000",
            }}
          >
            <div className="text-center flex items-center justify-center">
              <MdRotateLeft
                style={{
                  color: resolvedTheme === "dark" ? "#fff" : "#673AB7",
                  fontSize: "2rem",
                }}
              />
              <h2
                className="text-3xl font-bold ml-1"
                style={{
                  fontSize: "24px",
                  fontFamily: "Roboto",
                  color: resolvedTheme === "dark" ? "#fff" : "#000",
                }}
              >
                {appConfig.PROJECT_NAME}
              </h2>
            </div>

            <div
              className="text-center mb-3 font-bold"
              style={{
                fontFamily: "Roboto",
                color: resolvedTheme === "dark" ? "#fff" : "#673AB7",
                fontSize: "24px",
              }}
            >
              Choose Organization
            </div>

            <div className="space-y-2 max-h-64 overflow-y-scroll no-scrollbar justify-centre">
              {organizationname.map((org) => (
                <div
                  className="m-2 cursor-pointer"
                  key={org.name}
                  onClick={() => handleCardClick(org.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleCardClick(org.name)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select organization ${org.name}`}
                >
                  <Card
                    shadow="sm"
                    style={{
                      backgroundColor:
                        resolvedTheme === "dark" ? "#444" : "#fff",
                      color: resolvedTheme === "dark" ? "#fff" : "#000",
                    }}
                  >
                    <CardBody>
                      <div className="flex justify-between">
                        {org.name}
                        <IoIosArrowForward className="mt-1" />
                      </div>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </div>
            <div className="text-center justify-center mt-4">
              <Button
                color="secondary"
                onClick={() => setOrgOpenModal(true)}
                size="sm"
              >
                Create new organization
              </Button>
            </div>
          </div>
          <CreateOrganization
            isOpen={orgOpenModal}
            handleOrgCloseModal={handleOrgCloseModal}
            setupdate={setupdate}
          />
        </div>
      )}
    </div>
  )
}

export default selectorganization
