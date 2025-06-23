import React from "react"
import PropTypes from "prop-types"
import {
  Editor,
  EditorState,
  getDefaultKeyBinding,
  RichUtils,
  convertToRaw,
  convertFromRaw,
  CompositeDecorator,
} from "draft-js"
import "./RichTextEditor.css"
import "draft-js/dist/Draft.css"
import {
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdLink,
} from "react-icons/md"
import { GoCodeSquare } from "react-icons/go"
import { useTheme } from "next-themes"

export function Link({ contentState, entityKey, children }) {
  const { url } = contentState.getEntity(entityKey).getData()
  return (
    <a
      href={url}
      className="RichEditor-link"
      onClick={(e) => {
        e.preventDefault()
        window.open(url)
      }}
    >
      {children}
    </a>
  )
}

Link.propTypes = {
  contentState: PropTypes.instanceOf(Object).isRequired,
  entityKey: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}

export const findLinkEntities = (contentBlock, callback, contentState) => {
  contentBlock.findEntityRanges((character) => {
    const entityKey = character.getEntity()
    return (
      entityKey !== null &&
      contentState.getEntity(entityKey).getType() === "LINK"
    )
  }, callback)
}

export const createLinkDecorator = () =>
  new CompositeDecorator([
    {
      strategy: findLinkEntities,
      component: Link,
    },
  ])

function StyleButton({ active, label, onToggle, style }) {
  const onToggleHandler = (e) => {
    e.preventDefault()
    onToggle(style)
  }

  let buttonClassName = "RichEditor-styleButton"
  if (active) {
    buttonClassName += " RichEditor-activeButton"
  }

  return (
    <button
      type="button"
      className={buttonClassName}
      onMouseDown={onToggleHandler}
    >
      {label}
    </button>
  )
}

StyleButton.propTypes = {
  active: PropTypes.bool.isRequired,
  label: PropTypes.element.isRequired,
  onToggle: PropTypes.func.isRequired,
  style: PropTypes.string.isRequired,
}

const BLOCK_TYPES = [
  {
    label: <MdFormatListBulleted className="w-5 h-5" />,
    style: "unordered-list-item",
  },
  {
    label: <MdFormatListNumbered className="w-5 h-5" />,
    style: "ordered-list-item",
  },
]

const LINK_STYLE = {
  label: <MdLink className="w-5 h-5" />,
  style: "LINK",
}

function BlockStyleControls({ editorState, onToggle }) {
  const selection = editorState.getSelection()
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType()

  return (
    <div className="RichEditor-controls">
      {BLOCK_TYPES.map((type, index) => (
        <StyleButton
          key={index}
          active={type.style === blockType}
          label={type.label}
          onToggle={onToggle}
          style={type.style}
        />
      ))}
    </div>
  )
}

BlockStyleControls.propTypes = {
  editorState: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
}

const INLINE_STYLES = [
  { label: <MdFormatBold className="w-5 h-5 " />, style: "BOLD" },
  { label: <MdFormatItalic className="w-5 h-5" />, style: "ITALIC" },
  { label: <MdFormatUnderlined className="w-5 h-5" />, style: "UNDERLINE" },
  { label: <GoCodeSquare className="w-5 h-5" />, style: "CODE" },
]

function InlineStyleControls({ editorState, onToggle }) {
  const currentStyle = editorState.getCurrentInlineStyle()

  return (
    <div className="RichEditor-controls">
      {INLINE_STYLES.map((type, index) => (
        <StyleButton
          key={index}
          active={currentStyle.has(type.style)}
          label={type.label}
          onToggle={onToggle}
          style={type.style}
        />
      ))}
    </div>
  )
}

InlineStyleControls.propTypes = {
  editorState: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
}

class RichTextEditor extends React.Component {
  constructor(props) {
    super(props)

    const { initialContentState } = props

    let editorState
    if (initialContentState) {
      try {
        const contentState = convertFromRaw(JSON.parse(initialContentState))
        editorState = EditorState.createWithContent(
          contentState,
          createLinkDecorator(),
        )
      } catch (error) {
        console.error("Invalid initialContentState:", error)
        editorState = EditorState.createEmpty(createLinkDecorator())
      }
    } else {
      editorState = EditorState.createEmpty(createLinkDecorator())
    }

    this.state = {
      editorState,
    }

    this.handleKeyCommand = this.handleKeyCommand.bind(this)
    this.mapKeyToEditorCommand = this.mapKeyToEditorCommand.bind(this)
    this.toggleBlockType = this.toggleBlockType.bind(this)
    this.toggleInlineStyle = this.toggleInlineStyle.bind(this)
  }

  componentDidMount() {
    const { initialContentState } = this.props
    if (initialContentState) {
      try {
        const contentState = convertFromRaw(JSON.parse(initialContentState))
        const editorState = EditorState.createWithContent(
          contentState,
          createLinkDecorator(),
        )
        this.setState({ editorState })
      } catch (error) {
        console.error(
          "Invalid initialContentState in componentDidMount:",
          error,
        )
      }
    }
  }

  handleKeyCommand(command, editorState) {
    const newState = RichUtils.handleKeyCommand(editorState, command)
    if (newState) {
      this.onChange(newState)
      return true
    }
    return false
  }

  onChange = (newEditorState) => {
    const { onDescriptionChange } = this.props
    this.setState({ editorState: newEditorState })
    const contentState = newEditorState.getCurrentContent()
    const rawContentState = JSON.stringify(convertToRaw(contentState))
    onDescriptionChange(rawContentState)
  }

  addLink = () => {
    const { editorState } = this.state
    const selection = editorState.getSelection()

    if (!selection.isCollapsed()) {
      const contentState = editorState.getCurrentContent()
      const link = window.prompt("Enter link URL:")

      if (!link) {
        return
      }

      const contentStateWithEntity = contentState.createEntity(
        "LINK",
        "MUTABLE",
        { url: link },
      )
      const entityKey = contentStateWithEntity.getLastCreatedEntityKey()
      const newEditorState = EditorState.set(editorState, {
        currentContent: contentStateWithEntity,
      })

      this.onChange(RichUtils.toggleLink(newEditorState, selection, entityKey))
    }
  }

  mapKeyToEditorCommand(e) {
    if (e.keyCode === 9) {
      const { editorState } = this.state
      const newEditorState = RichUtils.onTab(e, editorState, 4)
      if (newEditorState !== editorState) {
        this.onChange(newEditorState)
        return "handled"
      }
      return "not-handled"
    }
    return getDefaultKeyBinding(e)
  }

  toggleBlockType(blockType) {
    const { editorState } = this.state
    this.onChange(RichUtils.toggleBlockType(editorState, blockType))
  }

  toggleInlineStyle(inlineStyle) {
    const { editorState } = this.state
    this.onChange(RichUtils.toggleInlineStyle(editorState, inlineStyle))
  }

  render() {
    const { editorState } = this.state
    const { resolvedTheme } = this.props
    let className = "RichEditor-editor"
    const contentState = editorState.getCurrentContent()
    if (!contentState.hasText()) {
      if (contentState.getBlockMap().first().getType() !== "unstyled") {
        className += " RichEditor-hidePlaceholder"
      }
    }

    const styleMap = {
      CODE: {
        backgroundColor:
          resolvedTheme === "dark"
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.05)",
        fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
        fontSize: 16,
        padding: 2,
        color: resolvedTheme === "dark" ? "#fff" : "inherit",
      },
      LINK: {
        color: resolvedTheme === "dark" ? "#7828c8" : "#007bff",
        textDecoration: "underline",
        cursor: "pointer",
      },
    }

    const getBlockStyle = (block) => {
      switch (block.getType()) {
        case "blockquote":
          return "RichEditor-blockquote"
        default:
          return null
      }
    }

    const rootClassName = `RichEditor-root ${
      resolvedTheme === "dark" ? "dark" : ""
    }`
    const editorClassName = `${className} ${
      resolvedTheme === "dark" ? "dark" : ""
    }`

    return (
      <div className={rootClassName}>
        <div className="flex gap-1">
          <InlineStyleControls
            editorState={editorState}
            onToggle={this.toggleInlineStyle}
          />
          <BlockStyleControls
            editorState={editorState}
            onToggle={this.toggleBlockType}
          />
          <button
            type="button"
            className="RichEditor-styleButton"
            onMouseDown={(e) => {
              e.preventDefault()
              this.addLink()
            }}
          >
            {LINK_STYLE.label}
          </button>
        </div>
        <div
          role="button"
          className={editorClassName}
          onClick={() => this.editorRef.focus()}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              this.editorRef.focus()
            }
          }}
        >
          <Editor
            blockStyleFn={getBlockStyle}
            customStyleMap={styleMap}
            editorState={editorState}
            handleKeyCommand={this.handleKeyCommand}
            keyBindingFn={this.mapKeyToEditorCommand}
            onChange={this.onChange}
            placeholder="Write a description..!"
            ref={(ref) => {
              this.editorRef = ref
            }}
            spellCheck
          />
        </div>
      </div>
    )
  }
}

RichTextEditor.propTypes = {
  initialContentState: PropTypes.string,
  onDescriptionChange: PropTypes.func.isRequired,
  resolvedTheme: PropTypes.string.isRequired,
}

RichTextEditor.defaultProps = {
  initialContentState: "",
}

function RichTextEditorWrapper(props) {
  const { resolvedTheme } = useTheme()
  return <RichTextEditor {...props} resolvedTheme={resolvedTheme} />
}

export default RichTextEditorWrapper
