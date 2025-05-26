import DiffMatchPatch from 'diff-match-patch';
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

const getPosition = (text: string): EditorPosition => {
  const lines = text.split('\n');
  return {
    ch: lines.at(-1)?.length ?? 0,
    line: lines.length - 1,
  };
};

export default class PrettierPlugin extends Plugin {
  settings: PrettierPluginSettings;
  originalCheckCallback?: (checking: boolean) => boolean | void;
  originalCallback?: () => void;

  private async format() {
    const editor = this.app.workspace.activeEditor?.editor;
    if (!editor || !editor.cm) {
      return;
    }

    const file = this.app.workspace.getActiveFile();
    const text = editor.getValue();
    if (text && file) {
      const formattedText = await prettier.format(text, {
        embeddedLanguageFormatting: 'auto',
        filepath: file.path,
        parser: 'markdown',
        plugins: [markdownPlugin],
        tabWidth: this.settings.tabWidth,
        useTabs: this.settings.useTabs,
      });

      // Switched to using DiffMatchPatch after I saw it here:
      // https://github.com/platers/obsidian-linter
      // And this style of updating the editor stops my cursor from jumping
      // around. Also, it keeps sections toggled if I've closed them.

      // eslint-disable-next-line new-cap
      const dmp = new DiffMatchPatch.diff_match_patch();
      const changes = dmp.diff_main(text, formattedText);

      let currentText = '';
      for (const change of changes) {
        const [type, value] = change;

        if (type === DiffMatchPatch.DIFF_INSERT) {
          editor.cm.dispatch({
            changes: [
              {
                from: editor.posToOffset(getPosition(currentText)),
                insert: value,
              },
            ],
            filter: false,
          });
          currentText += value;
        } else if (type === DiffMatchPatch.DIFF_DELETE) {
          const start = getPosition(currentText);
          const end = getPosition(currentText + value);

          editor.cm.dispatch({
            changes: [
              {
                from: editor.posToOffset(start),
                insert: '',
                to: editor.posToOffset(end),
              },
            ],
            filter: false,
          });
        } else {
          currentText += value;
        }
      }
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
    this.originalCheckCallback = handleSave.checkCallback;

    handleSave.checkCallback = (checking: boolean) => {
      // If checkCallback is defined (i.e. obsidian > 1.9.0)
      if (this.originalCheckCallback) {
        this.originalCheckCallback.apply(handleSave, [checking]);
      } else if (this.originalCallback) {
        // Otherwise call original callback method.
        // Note: this won't be called normally if checkCallback is defined
        this.originalCallback.apply(handleSave);
      }

      this.onFileSave();
    };
  }

  private revertSave() {
    const handleSave = this.getSave();

    if (!handleSave || !this.originalCheckCallback) {
      return;
    }

    handleSave.checkCallback = this.originalCheckCallback;
  }

  async onload() {
    // eslint-disable-next-line no-console
    console.log('loading prettier-format');
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
