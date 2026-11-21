import { useEffect, useRef, useState } from "react";
import {
  Box,
  Divider,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import FormatClearIcon from "@mui/icons-material/FormatClear";
import {
  hasHtmlMarkup,
  sanitizeAnnouncementHtml,
  stripAnnouncementHtml,
  toEditorHtml,
  toEditorValue,
} from "../../utils/announcementFormat";

const TEXT_COLORS = [
  { label: "Default", value: "inherit" },
  { label: "Charcoal", value: "#1f2937" },
  { label: "Blue", value: "#2563eb" },
  { label: "Teal", value: "#0f766e" },
  { label: "Green", value: "#15803d" },
  { label: "Amber", value: "#b45309" },
  { label: "Red", value: "#dc2626" },
  { label: "Purple", value: "#7c3aed" },
];

const TEXT_SIZES = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Subheading", value: "4" },
  { label: "Heading", value: "5" },
];

export default function RichTextEditor({
  label = "Announcement",
  value = "",
  onChange,
  placeholder = "Write your announcement...",
  disabled = false,
  required = false,
  minHeight = 160,
}) {
  const editorRef = useRef(null);
  const lastEmittedValueRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const focusedRef = useRef(false);
  const [focused, setFocused] = useState(false);
  const [textSize, setTextSize] = useState("3");
  const [colorAnchor, setColorAnchor] = useState(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (focusedRef.current || value === lastEmittedValueRef.current) return;
    const incomingHtml = toEditorHtml(value);
    if (incomingHtml !== editor.innerHTML) {
      editor.innerHTML = incomingHtml;
    }
    lastEmittedValueRef.current = value;
  }, [value]);

  const refreshActiveFormats = () => {
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      // Ignore queryCommandState errors when selection is outside the document.
    }
  };

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const rawHtml = editor.innerHTML;
    const nextValue = stripAnnouncementHtml(rawHtml)
      ? hasHtmlMarkup(rawHtml)
        ? sanitizeAnnouncementHtml(rawHtml)
        : toEditorValue(rawHtml)
      : "";
    lastEmittedValueRef.current = nextValue;
    onChange?.(nextValue);
    refreshActiveFormats();
  };

  const runCommand = (command, commandValue = null) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const handleSizeChange = (event) => {
    const nextSize = event.target.value;
    setTextSize(nextSize);
    editorRef.current?.focus();
    restoreSelection();
    runCommand("fontSize", nextSize);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = () => {
    const range = savedSelectionRef.current;
    if (!range) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleColorSelect = (colorValue) => {
    setColorAnchor(null);
    editorRef.current?.focus();
    restoreSelection();
    if (colorValue === "inherit") {
      runCommand("removeFormat");
      return;
    }
    runCommand("foreColor", colorValue);
  };

  const handlePaste = (event) => {
    if (disabled) return;
    event.preventDefault();
    const htmlData = event.clipboardData?.getData("text/html");
    const textData = event.clipboardData?.getData("text/plain") || "";
    if (htmlData) {
      const cleaned = sanitizeAnnouncementHtml(htmlData);
      document.execCommand("insertHTML", false, cleaned);
    } else {
      document.execCommand("insertText", false, textData);
    }
    emitChange();
  };

  const isEmpty = !stripAnnouncementHtml(value);

  const toggleButton = (title, command, IconComponent, activeKey) => {
    const isActive = Boolean(activeKey && activeFormats[activeKey]);
    return (
      <Tooltip title={title}>
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand(command)}
            color={isActive ? "primary" : "default"}
            sx={{
              borderRadius: 1,
              bgcolor: isActive ? "action.selected" : "transparent",
            }}
            aria-label={title}
          >
            <IconComponent fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    );
  };

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ mb: 0.75, fontWeight: 600, color: "text.primary" }}
      >
        {label}
        {required ? " *" : ""}
      </Typography>
      <Box
        sx={{
          border: "1px solid",
          borderColor: focused ? "primary.main" : "divider",
          borderRadius: 1.5,
          overflow: "hidden",
          bgcolor: "background.paper",
          boxShadow: focused ? "0 0 0 1px rgba(37, 99, 235, 0.25)" : "none",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {/* Formatting Toolbar */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.75,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 112 }}>
            <Select
              value={textSize}
              onMouseDown={saveSelection}
              onChange={handleSizeChange}
              disabled={disabled}
              aria-label="Text size"
              sx={{
                fontSize: "0.8rem",
                height: 30,
                bgcolor: "background.paper",
              }}
            >
              {TEXT_SIZES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

          {toggleButton("Bold", "bold", FormatBoldIcon, "bold")}
          {toggleButton("Italic", "italic", FormatItalicIcon, "italic")}
          {toggleButton("Underline", "underline", FormatUnderlinedIcon, "underline")}
          {toggleButton(
            "Strikethrough",
            "strikeThrough",
            FormatStrikethroughIcon,
            "strikeThrough",
          )}

          <Tooltip title="Text Color">
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                onMouseDown={(event) => {
                  event.preventDefault();
                  saveSelection();
                }}
                onClick={(event) => setColorAnchor(event.currentTarget)}
                aria-label="Text Color"
                sx={{ borderRadius: 1 }}
              >
                <FormatColorTextIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Menu
            anchorEl={colorAnchor}
            open={Boolean(colorAnchor)}
            onClose={() => setColorAnchor(null)}
          >
            {TEXT_COLORS.map((item) => (
              <MenuItem
                key={item.label}
                onClick={() => handleColorSelect(item.value)}
                sx={{ gap: 1.5 }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    bgcolor: item.value === "inherit" ? "text.primary" : item.value,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
                <Typography variant="body2">{item.label}</Typography>
              </MenuItem>
            ))}
          </Menu>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

          {toggleButton(
            "Bulleted List",
            "insertUnorderedList",
            FormatListBulletedIcon,
            "insertUnorderedList",
          )}
          {toggleButton(
            "Numbered List",
            "insertOrderedList",
            FormatListNumberedIcon,
            "insertOrderedList",
          )}

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

          {toggleButton("Align Left", "justifyLeft", FormatAlignLeftIcon)}
          {toggleButton("Align Center", "justifyCenter", FormatAlignCenterIcon)}
          {toggleButton("Align Right", "justifyRight", FormatAlignRightIcon)}

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

          {toggleButton("Clear Formatting", "removeFormat", FormatClearIcon)}
        </Box>

        {/* Editable Area */}
        <Box sx={{ position: "relative" }}>
          {isEmpty && (
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{
                position: "absolute",
                top: 12,
                left: 14,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {placeholder}
            </Typography>
          )}
          <Box
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={emitChange}
            onKeyUp={refreshActiveFormats}
            onMouseUp={refreshActiveFormats}
            onPaste={handlePaste}
            onFocus={() => {
              focusedRef.current = true;
              setFocused(true);
              refreshActiveFormats();
            }}
            onBlur={() => {
              focusedRef.current = false;
              setFocused(false);
              emitChange();
            }}
            role="textbox"
            aria-multiline="true"
            aria-label={label}
            sx={{
              minHeight,
              maxHeight: 360,
              overflowY: "auto",
              px: 1.75,
              py: 1.5,
              outline: "none",
              color: "text.primary",
              fontSize: "0.95rem",
              lineHeight: 1.65,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              "& ul, & ol": { pl: 3, my: 0.75 },
              "& p": { my: 0.5 },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
