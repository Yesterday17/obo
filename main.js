const {
  Plugin,
  FileSystemAdapter,
  PluginSettingTab,
  Setting,
} = require("obsidian");
const { writeFileSync } = require("fs");

// https://github.com/tillahoffmann/obsidian-jupyter/blob/e1e28db25fd74cd16844b37d0fe2eda9c3f2b1ee/main.ts#L175
const getAbsolutePath = () => {
  let basePath;
  // base path
  if (this.app.vault.adapter instanceof FileSystemAdapter) {
    basePath = this.app.vault.adapter.getBasePath();
  } else {
    throw new Error("Cannot determine base path.");
  }
  // relative path
  const relativePath = `${this.app.vault.configDir}/plugins/obo-exporter/cache.json`;
  // absolute path
  return `${basePath}/${relativePath}`;
};

function positionToPos(input) {
  input.pos = [
    input.position.start.line,
    input.position.start.col,
    input.position.start.offset,
    input.position.end.line,
    input.position.end.col,
    input.position.end.offset,
  ];
  delete input.position;
}

function tryPositionToPos(input) {
  if (input.position) {
    positionToPos(input);
  } else if (Array.isArray(input)) {
    input.forEach((input) => tryPositionToPos(input));
  } else if (typeof input === "object") {
    Object.values(input).forEach((input) => tryPositionToPos(input));
  }
}

class MyPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MySettingTab(this.app, this));

    // this.app.commands.executeCommandById('obo-exporter:export-cache')
    this.addCommand({
      id: "export-cache",
      name: "Export metadata cache to JSON file",
      callback: () => {
        const files = this.app.metadataCache.getCachedFiles();
        const result = Object.fromEntries(
          files.map((file) => {
            const { hash } = this.app.metadataCache.fileCache[file];
            if (hash) {
              const cache = structuredClone(
                this.app.metadataCache.metadataCache[hash]
              );
              tryPositionToPos(cache);
              return [file, cache];
            } else {
              return [file, null];
            }
          })
        );
        writeFileSync(
          getAbsolutePath(),
          JSON.stringify(
            Object.fromEntries(
              Object.entries(result).sort(([aKey, a], [bKey, b]) => {
                const aCreatedAt = a?.frontmatter?.created;
                const bCreatedAt = b?.frontmatter?.created;

                if (a === null && b === null) {
                  return 0;
                } else if (a === null) {
                  return 1;
                } else if (b === null) {
                  return -1;
                } else {
                  return new Date(aCreatedAt) - new Date(bCreatedAt);
                }
              })
            )
          )
        );
      },
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

const DEFAULT_SETTINGS = {
  siteName: "",
  indexFile: "",
  showHoverPreview: true,
  showSearch: true,
  showOutline: true,
  showBacklinks: true,
  showThemeToggle: true,
};

class MySettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    let { containerEl } = this;

    containerEl.empty();
    containerEl.createEl("h2", { text: "Settings for obo" });

    let contentEl = containerEl.createEl("div");
    new Setting(contentEl)
      .setName("Site name")
      .setDesc("Name for the generated site")
      .addText((text) =>
        text
          .setPlaceholder("Site Name")
          .setValue(this.plugin.settings.siteName)
          .onChange(async (value) => {
            this.plugin.settings.siteName = value;
            await this.plugin.saveSettings();
          })
      );

    contentEl = containerEl.createEl("div");
    new Setting(contentEl)
      .setName("Index file")
      .setDesc("File to be used as front page")
      .addText((text) =>
        text
          .setPlaceholder("Index")
          .setValue(this.plugin.settings.indexFile)
          .onChange(async (value) => {
            this.plugin.settings.indexFile = value;
            await this.plugin.saveSettings();
          })
      );
    // .addSearch((search) => {
    //   search.setPlaceholder("Input the link name...").onChange((value) => {
    //     new PluginSuggest(this.app, value.inputEl);
    //     value
    //       .setValue(this.plugin.settings.indexFile)
    //       .onChange(async (value) => {
    //         this.plugin.settings.indexFile = value;
    //         await this.plugin.saveSettings();
    //       });
    //   });
    // });

    contentEl = containerEl.createEl("div");
    new Setting(contentEl)
      .setName("Hover preview")
      .setDesc("Enable hover preview")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showHoverPreview)
          .onChange(async (value) => {
            this.plugin.settings.showHoverPreview = value;
            await this.plugin.saveSettings();
          })
      );

    contentEl = containerEl.createEl("div");
    new Setting(contentEl)
      .setName("Search")
      .setDesc("Enable search")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showSearch)
          .onChange(async (value) => {
            this.plugin.settings.showSearch = value;
            await this.plugin.saveSettings();
          })
      );
    contentEl = containerEl.createEl("div");
    new Setting(contentEl)
      .setName("Outline")
      .setDesc("Show outline")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showOutline)
          .onChange(async (value) => {
            this.plugin.settings.showOutline = value;
            await this.plugin.saveSettings();
          })
      );

    contentEl = containerEl.createEl("div");
    new Setting(contentEl)
      .setName("Backlinks")
      .setDesc("Show backlinks")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showBacklinks)
          .onChange(async (value) => {
            this.plugin.settings.showBacklinks = value;
            await this.plugin.saveSettings();
          })
      );

    contentEl = containerEl.createEl("div");
    new Setting(contentEl)
      .setName("Toggleable theme")
      .setDesc("Enable theme toggle")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showThemeToggle)
          .onChange(async (value) => {
            this.plugin.settings.showThemeToggle = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

module.exports = MyPlugin;
