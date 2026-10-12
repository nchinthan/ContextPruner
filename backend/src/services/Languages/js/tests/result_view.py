import sys
import json
import difflib
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QLabel, QPushButton, QTextEdit, QSplitter, QShortcut
)
from PyQt5.QtGui import QTextCharFormat, QColor, QKeySequence
from PyQt5.QtCore import Qt
from pathlib import Path

class DiffViewer(QMainWindow):
    def __init__(self, failure_data):
        super().__init__()
        self.failures = failure_data
        self.current_index = 0
        # Cache for lazy-loaded diff results: {index: (left_tuple, right_tuple)}
        self.diff_cache = {}

        self.init_ui()
        if self.failures:
            self.load_failure(self.current_index)

    def init_ui(self):
        self.setWindowTitle("Test Failure Visualizer - PyQt5")
        self.resize(1200, 750)
        
        # Dark Theme Styling
        self.setStyleSheet("""
            QMainWindow, QWidget { background-color: #1e1e1e; color: #d4d4d4; font-family: 'Segoe UI', sans-serif; }
            QPushButton { background-color: #333333; color: #ffffff; border: 1px solid #454545; border-radius: 4px; padding: 6px 12px; font-weight: bold; }
            QPushButton:hover { background-color: #454545; }
            QPushButton:disabled { background-color: #222222; color: #555555; border: 1px solid #2a2a2a; }
            QLabel { font-size: 13px; }
            QTextEdit { background-color: #1e1e1e; color: #d4d4d4; border: 1px solid #333333; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; }
        """)

        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QVBoxLayout(main_widget)
        main_layout.setContentsMargins(12, 12, 12, 12)
        main_layout.setSpacing(10)

        # Navigation Bar
        nav_layout = QHBoxLayout()
        
        self.btn_prev = QPushButton("◀ Previous")
        self.btn_prev.clicked.connect(self.prev_file)
        
        self.btn_next = QPushButton("Next ▶")
        self.btn_next.clicked.connect(self.next_file)
        
        self.lbl_counter = QLabel("0 / 0")
        self.lbl_counter.setAlignment(Qt.AlignCenter)
        self.lbl_counter.setStyleSheet("font-weight: bold; font-size: 14px; color: #569cd6;")

        self.lbl_file_path = QLabel("File: N/A")
        self.lbl_file_path.setStyleSheet("color: #ce9178; font-weight: bold;")

        nav_layout.addWidget(self.btn_prev)
        nav_layout.addWidget(self.btn_next)
        nav_layout.addWidget(self.lbl_counter)
        nav_layout.addWidget(self.lbl_file_path, 1)

        main_layout.addLayout(nav_layout)

        # Splitter Layout for Side-by-Side Diffing
        splitter = QSplitter(Qt.Horizontal)

        # Left Container (Original)
        left_container = QWidget()
        left_layout = QVBoxLayout(left_container)
        left_layout.setContentsMargins(0, 0, 0, 0)
        lbl_orig = QLabel("Original Code")
        lbl_orig.setStyleSheet("background-color: #252526; padding: 4px; border: 1px solid #333;")
        self.txt_original = QTextEdit()
        self.txt_original.setReadOnly(True)
        self.txt_original.setLineWrapMode(QTextEdit.NoWrap)
        left_layout.addWidget(lbl_orig)
        left_layout.addWidget(self.txt_original)

        # Right Container (Reconstructed)
        right_container = QWidget()
        right_layout = QVBoxLayout(right_container)
        right_layout.setContentsMargins(0, 0, 0, 0)
        lbl_recon = QLabel("Reconstructed Code")
        lbl_recon.setStyleSheet("background-color: #252526; padding: 4px; border: 1px solid #333;")
        self.txt_reconstructed = QTextEdit()
        self.txt_reconstructed.setReadOnly(True)
        self.txt_reconstructed.setLineWrapMode(QTextEdit.NoWrap)
        right_layout.addWidget(lbl_recon)
        right_layout.addWidget(self.txt_reconstructed)

        splitter.addWidget(left_container)
        splitter.addWidget(right_container)
        splitter.setSizes([600, 600])

        main_layout.addWidget(splitter, 1)

        # Synchronize Scrollbars
        self.txt_original.verticalScrollBar().valueChanged.connect(
            self.txt_reconstructed.verticalScrollBar().setValue
        )
        self.txt_reconstructed.verticalScrollBar().valueChanged.connect(
            self.txt_original.verticalScrollBar().setValue
        )

        # Shortcuts
        QShortcut(QKeySequence(Qt.Key_Left), self, self.prev_file)
        QShortcut(QKeySequence(Qt.Key_Right), self, self.next_file)

    def compute_file_diff(self, original_text, reconstructed_text):
        """Computes side-by-side line diffs dynamically using difflib SequenceMatcher."""
        orig_lines = original_text.splitlines()
        recon_lines = reconstructed_text.splitlines()

        left_lines, right_lines = [], []
        left_statuses, right_statuses = [], []

        matcher = difflib.SequenceMatcher(None, orig_lines, recon_lines)

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                for line in orig_lines[i1:i2]:
                    left_lines.append(line)
                    right_lines.append(line)
                    left_statuses.append('normal')
                    right_statuses.append('normal')
            elif tag == 'replace':
                orig_chunk = orig_lines[i1:i2]
                recon_chunk = recon_lines[j1:j2]
                max_len = max(len(orig_chunk), len(recon_chunk))

                for k in range(max_len):
                    if k < len(orig_chunk):
                        left_lines.append(orig_chunk[k])
                        left_statuses.append('removed')
                    else:
                        left_lines.append('')
                        left_statuses.append('normal')

                    if k < len(recon_chunk):
                        right_lines.append(recon_chunk[k])
                        right_statuses.append('added')
                    else:
                        right_lines.append('')
                        right_statuses.append('normal')

            elif tag == 'delete':
                for line in orig_lines[i1:i2]:
                    left_lines.append(line)
                    right_lines.append(' '*100)
                    left_statuses.append('removed')
                    right_statuses.append('removed')
            elif tag == 'insert':
                for line in recon_lines[j1:j2]:
                    left_lines.append(' '*100)
                    right_lines.append(line)
                    left_statuses.append('added')
                    right_statuses.append('added')

        return (left_lines, left_statuses), (right_lines, right_statuses)

    def load_failure(self, index):
        if not (0 <= index < len(self.failures)):
            return

        item = self.failures[index]
        self.lbl_file_path.setText(f"File: {item.get('file', 'N/A')}")
        self.lbl_counter.setText(f"{index + 1} / {len(self.failures)}")

        self.btn_prev.setEnabled(index > 0)
        self.btn_next.setEnabled(index < len(self.failures) - 1)

        # Lazy loading: compute diff on demand and cache the result
        if index not in self.diff_cache:
            diff_dict = item.get("diff", {})
            original_code = diff_dict.get("original_script", "")
            reconstructed_code = diff_dict.get("reconstructed_script", "")
            
            self.diff_cache[index] = self.compute_file_diff(original_code, reconstructed_code)

        (orig_lines, orig_statuses), (recon_lines, recon_statuses) = self.diff_cache[index]

        self.render_editor(self.txt_original, orig_lines, orig_statuses)
        self.render_editor(self.txt_reconstructed, recon_lines, recon_statuses)

    def render_editor(self, editor, lines, statuses):
        editor.clear()
        cursor = editor.textCursor()

        fmt_normal = QTextCharFormat()
        fmt_normal.setForeground(QColor("#d4d4d4"))

        fmt_removed = QTextCharFormat()
        fmt_removed.setBackground(QColor("#5a1d1d"))
        fmt_removed.setForeground(QColor("#f88080"))

        fmt_added = QTextCharFormat()
        fmt_added.setBackground(QColor("#1e4a20"))
        fmt_added.setForeground(QColor("#89d185"))

        for line, status in zip(lines, statuses):
            if status == "removed":
                cursor.insertText(line + "\n", fmt_removed)
            elif status == "added":
                cursor.insertText(line + "\n", fmt_added)
            else:
                cursor.insertText(line + "\n", fmt_normal)

        editor.moveCursor(cursor.Start)

    def prev_file(self):
        if self.current_index > 0:
            self.current_index -= 1
            self.load_failure(self.current_index)

    def next_file(self):
        if self.current_index < len(self.failures) - 1:
            self.current_index += 1
            self.load_failure(self.current_index)


if __name__ == "__main__":
    js_test_dir = Path(__file__).parent.resolve()
    with open(js_test_dir / 'result.json', 'r') as f:
        sample_data = json.load(f).get('failed')

    app = QApplication(sys.argv)
    viewer = DiffViewer(sample_data)
    viewer.show()
    sys.exit(app.exec_())