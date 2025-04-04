import { App, PluginSettingTab, Setting } from 'obsidian';

import PrettierPlugin from './prettier-plugin.js';

export default class PrettierSettingTab extends PluginSettingTab {
  plugin: PrettierPlugin;

  constructor(app: App, plugin: PrettierPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Format on Save')
      .setDesc('Format file automatically when you save')
      .addToggle((component) =>
        component
          .setValue(this.plugin.settings.formatOnSave)
          .onChange(
            async (value) => (this.plugin.settings.formatOnSave = value),
          ),
      );

    containerEl.createEl('hr', { cls: 'prettier-plugin-hr' });
    containerEl.createEl('div', {
      cls: 'prettier-plugin-settings-description',
      text: 'These are the settings currently set in the "Editor" tab, please edit them there if you would like to change them.',
    });

    const { useTabs, tabWidth } = this.plugin.settings;
    new Setting(containerEl)
      .setName('Indent using tabs')
      .setDesc(
        `Use tabs to indent by pressing the "Tab" key. Turn this off to indent using ${tabWidth} spaces.`,
      )
      .setDisabled(true)
      .addToggle((component) => component.setValue(useTabs).setDisabled(true));

    new Setting(containerEl)
      .setName('Indent visual width')
      .setDesc('Number of spaces a tab character will render as.')
      .addSlider((component) =>
        component.setValue(tabWidth).setDisabled(true).setDynamicTooltip(),
      );
  }
}
