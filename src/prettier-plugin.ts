import { EditorPosition, Plugin } from 'obsidian';

import * as markdownPlugin from 'prettier/plugins/markdown';
import * as prettier from 'prettier/standalone';

import PrettierSettingTab from './prettier-setting-tab.js';

interface PrettierPluginSettings {
  formatOnSave: boolean;
  tabWidth: number;
  useTabs: boolean;
}

const DEFAULT_SETTINGS: PrettierPluginSettings = {
  formatOnSave: true,
  tabWidth: 4,
  useTabs: true,
};

// Taken from https://github.com/alexgavrusev/obsidian-format-with-prettier/blob/master/src/cursor-position-utils.ts
// If the cursor is on line i, on character j, the offset
// is j plus sum of lengths (incl. the \n at the end) of lines 0..(i - 1)
const toOffset = (position: EditorPosition, text: string): number =>
  text
    .split('\n')
    .slice(0, position.line)
    .reduce((accumulator, line) => accumulator + line.length + 1, position.ch);

const fromOffset = (offset: number, text: string): EditorPosition => {
  const textUpToOffset = text.slice(0, offset);
  const newLines = textUpToOffset.split('\n');

  return {
    ch: newLines?.at(-1)?.length || 0,
    line: newLines.length - 1,
  };
};

export default class PrettierPlugin extends Plugin {
  settings: PrettierPluginSettings;
  originalCallback: () => void | undefined;

  private async format() {
    const editor = this.app.workspace.activeEditor?.editor;
    if (!editor) {
      return;
    }

    const file = this.app.workspace.getActiveFile();
    const text = editor.getValue();
    if (text && file) {
      const position = editor.getCursor();
      const cursorOffset = toOffset(position, text);

      const { cursorOffset: formattedCursorOffset, formatted: formattedText } =
        await prettier.formatWithCursor(text, {
          cursorOffset,
          filepath: file.path,
          parser: 'markdown',
          plugins: [markdownPlugin],
          tabWidth: this.settings.tabWidth,
          useTabs: this.settings.useTabs,
        });

      editor.setValue(formattedText);
      editor.setCursor(fromOffset(formattedCursorOffset, formattedText));
    }
  }

  private getSave() {
    return this.app.commands?.commands?.['editor:save-file'];
  }

  private onFileSave() {
    if (this.settings.formatOnSave) {
      this.format();
    }
  }

  private patchSave() {
    const handleSave = this.getSave();

    if (!handleSave) {
      return;
    }

    this.originalCallback = handleSave.callback;

    handleSave.callback = () => {
      this.originalCallback?.apply(handleSave);
      this.onFileSave();
    };
  }

  private revertSave() {
    const handleSave = this.getSave();

    if (!handleSave || !this.originalCallback) {
      return;
    }

    handleSave.callback = this.originalCallback;
  }

  async onload() {
    await this.loadSettings();

    this.patchSave();
    this.addSettingTab(new PrettierSettingTab(this.app, this));
    this.addCommands();
  }

  onunload() {
    this.revertSave();
  }

  private addCommands() {
    this.addCommand({
      editorCheckCallback: (checking, _, context) => {
        const { file } = context;

        if (!file) {
          return false;
        }

        if (checking) {
          return true;
        }

        this.format();

        return true;
      },
      id: 'format-file',
      name: 'Format current file',
    });
  }

  async loadSettings() {
    this.settings = {
      ...DEFAULT_SETTINGS,
      tabWidth: this.app.vault.getConfig('tabSize'),
      useTabs: this.app.vault.getConfig('useTab'),
      ...(await this.loadData()),
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
