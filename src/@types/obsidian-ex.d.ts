// Modified from https://github.com/platers/obsidian-linter/blob/8fbaa410907b87965e471ca46bb2ec6fb354b05e/src/typings/obsidian-ex.d.ts

import { Command } from 'obsidian';
import { EditorView } from '@codemirror/view';

export interface ObsidianCommandInterface {
  executeCommandById(id: string): void;
  commands: {
    'editor:save-file': {
      callback(): void;
    };
  };
  listCommands(): Command[];
}

// allows for the removal of the any cast by defining some extra properties for Typescript so it knows these properties exist
declare module 'obsidian' {
  export interface ViewStateResult {
    /**
     * Set this to true to indicate that there is a state change which should be recorded in the navigation history.
     * @public
     */
    history: boolean;
  }

  interface FileView {
    /**
     * @public
     */
    allowNoFile: boolean;
    /**
     * File views can be navigated by default.
     * @inheritDoc
     * @public
     */
    navigation: boolean;

    /**
     * @public
     */
    getDisplayText(): string;
    /**
     * @public
     */
    onload(): void;
    /**
     * @public
     */
    getState(): unknown;

    /**
     * @public
     */
    setState(state: unknown, result: ViewStateResult): Promise<void>;
  }

  interface Workspace {
    getActiveFileView: () => FileView;
  }

  interface App {
    commands: ObsidianCommandInterface;
    dom: {
      appContainerEl: HTMLElement;
    };
    workspace: Workspace;
  }

  interface Vault {
    getConfig(id: string): boolean;
  }

  interface Editor {
    /**
     * CodeMirror editor instance
     */
    cm?: EditorView;
  }
}

declare global {
  interface Window {
    CodeMirrorAdapter: {
      commands: {
        save(): void;
      };
    };
  }
}
