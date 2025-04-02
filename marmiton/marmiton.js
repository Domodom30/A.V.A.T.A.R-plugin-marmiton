import * as path from 'node:path';
import fs from 'fs-extra';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import * as marmitonAskme from './lib/marmiton-askme.js';
import * as marmitonApi from './lib/marmiton-lib.js';

import * as widgetLib from '../../../widgetLibrairy.js';
const Widget = await widgetLib.init();

let Locale;
let periphInfo = [];
let currentwidgetState;
let marmitonWindow, recetteWindow;

const widgetFolder = path.resolve(__dirname, 'assets/widget');
const widgetImgFolder = path.resolve(__dirname, 'assets/images/widget');

export async function onClose(widgets) {
   // Save widget positions
   if (Config.modules.marmiton.widget.display === true) {
      await Widget.initVar(widgetFolder, widgetImgFolder, null, Config.modules.marmiton);
      if (widgets) await Widget.saveWidgets(widgets);
   }
}

export async function init() {
   if (!(await Avatar.lang.addPluginPak('marmiton'))) {
      return error('marmiton: unable to load language pak files');
   }

   Locale = await Avatar.lang.getPak('marmiton', Config.language);
   if (!Locale) {
      return error(`marmiton: Unable to find the '${Config.language}' language pak.`);
   }

   periphInfo.push({
      Buttons: [
         {
            name: 'Settings',
            value_type: 'button',
            usage_name: 'Button',
            periph_id: '777777',
            notes: 'Open marmiton settings',
         },
      ],
   });
}

export async function getWidgetsOnLoad() {
   if (Config.modules.marmiton.widget.display === true) {
      await Widget.initVar(widgetFolder, widgetImgFolder, null, Config.modules.marmiton);
      let widgets = await Widget.getWidgets();
      return { plugin: 'marmiton', widgets: widgets, Config: Config.modules.marmiton };
   }
}

export async function getNewButtonState(arg) {
   return currentwidgetState === true ? 'On' : 'Off';
}

export async function getPeriphInfo() {
   return periphInfo;
}

export async function widgetAction(even) {
   let widgetCommands = extractCommands(even);
   even.action = { remote: false };

   if (widgetCommands[0]) {
      switch (widgetCommands[0].command) {
         case 'recette':
            openRecetteWindow();
            break;
         default:
            break;
      }
   }

   if (even.type !== 'button') {
      await Widget.initVar(widgetFolder, widgetImgFolder, null, Config.modules.marmiton);
      return await Widget.widgetAction(even, periphInfo);
   } else {
      currentwidgetState = even.value.action === 'On' ? true : false;
      if (!marmitonWindow && even.value.action === 'On') await openMarmitonWindow();

      if (marmitonWindow && even.value.action === 'Off') return marmitonWindow.destroy();
   }
}

export async function readyToShow() {
   if (fs.existsSync(path.resolve(__dirname, 'assets', 'style.json'))) {
      let prop = fs.readJsonSync(path.resolve(__dirname, 'assets', 'style.json'), { throws: false });
      currentwidgetState = prop.start;
      if (currentwidgetState) openMarmitonWindow();
   } else currentwidgetState = false;
   Avatar.Interface.refreshWidgetInfo({ plugin: 'marmiton', id: '777777' });
}

export async function action(data, callback) {
   try {
      const tblActions = {
         search: () => marmitonAskme.askmeChercheRecette(data),
         searchDirect: async () => {
            await marmitonApi.scrapeFullRecipes(data.action.word);
         },
         afficheRecette: async () => {
            openRecetteWindow(data.action.recettes);
         },
         close: () => {
            if (recetteWindow) recetteWindow.destroy();
         },
      };

      info('marmiton: ', data.action.command, L.get('plugin.from'), data.client);

      await tblActions[data.action.command]();
   } catch (err) {
      if (data.client) Avatar.Speech.end(data.client);
      if (err.message) error(err.message);
   }
   callback();
}

const openMarmitonWindow = async () => {
   if (marmitonWindow) return marmitonWindow.show();
   if (!Config?.modules?.marmiton) {
      return infoOrange('Configuration du module Marmiton introuvable.');
   }
   let style = {
      parent: Avatar.Interface.mainWindow(),
      frame: false,
      movable: true,
      resizable: true,
      minimizable: false,
      alwaysOnTop: false,
      show: false,
      width: 460,
      height: 360,
      opacity: 1,
      icon: path.resolve(__dirname, 'assets', 'images', 'marmiton.png'),
      webPreferences: {
         preload: path.resolve(__dirname, 'assets', 'html', 'settings-preload.js'),
      },
      title: 'Paramètres Marmiton',
   };

   marmitonWindow = await Avatar.Interface.BrowserWindow(style, path.resolve(__dirname, 'assets', 'html', 'settings.html'), false);

   marmitonWindow.once('ready-to-show', () => {
      marmitonWindow.show();
      marmitonWindow.webContents.send('onInit-marmiton', Config.modules.marmiton);
      if (Config.modules.marmiton.devTools) {
         marmitonWindow.webContents.openDevTools();
      }
   });

   Avatar.Interface.ipcMain().on('marmiton-quit', () => {
      marmitonWindow.destroy();
      Avatar.Interface.refreshWidgetInfo({ plugin: 'marmiton', id: '777777' });
   });

   // returns the localized message defined in arg
   Avatar.Interface.ipcMain().handle('marmiton-msg', async (_event, arg) => {
      return Locale.get(arg);
   });

   Avatar.Interface.ipcMain().handle('marmiton-save', async (_event, dataConfig) => {
      return await saveConfig(dataConfig);
   });

   marmitonWindow.on('closed', () => {
      currentwidgetState = false;
      Avatar.Interface.ipcMain().removeHandler('marmiton-msg');
      Avatar.Interface.ipcMain().removeHandler('marmiton-save');
      Avatar.Interface.ipcMain().removeAllListeners('marmiton-quit');
      marmitonWindow = null;
   });
};

export async function openRecetteWindow(recettes) {
   if (recetteWindow) return recetteWindow.show();

   let style = {
      parent: Avatar.Interface.mainWindow(),
      frame: false,
      movable: true,
      resizable: true,
      minimizable: false,
      alwaysOnTop: false,
      show: false,
      width: Config.modules.marmiton.settings.window.width,
      height: Config.modules.marmiton.settings.window.height,
      opacity: Config.modules.marmiton.settings.window.opacity,
      icon: path.resolve(__dirname, 'assets', 'images', 'marmiton.png'),
      webPreferences: {
         preload: path.resolve(__dirname, 'assets', 'html', 'recette-preload.js'),
      },
      title: 'Recette Marmiton',
   };

   recetteWindow = await Avatar.Interface.BrowserWindow(style, path.resolve(__dirname, 'assets', 'html', 'recette.html'), false);

   recetteWindow.once('ready-to-show', () => {
      recetteWindow.show();
      recetteWindow.webContents.send('onInit-marmiton', Config.modules.marmiton, recettes);
      if (Config.modules.marmiton.devTools) {
         recetteWindow.webContents.openDevTools();
      }
   });

   Avatar.Interface.ipcMain().on('marmiton-quit', () => {
      recetteWindow.destroy();
      Avatar.Interface.refreshWidgetInfo({ plugin: 'marmiton', id: '777777' });
   });

   Avatar.Interface.ipcMain().handle('marmiton-msg', async (_event, arg) => {
      return Locale.get(arg);
   });

   Avatar.Interface.ipcMain().handle('marmiton-recette', async (_event, keyword) => {
      return await marmitonApi.scrapeFullRecipes(keyword);
   });

   Avatar.Interface.ipcMain().handle('marmiton-calcul', async (_event, recettes, nbperson) => {
      return await marmitonApi.calculRecettesNbPerson(recettes, nbperson);
   });

   recetteWindow.on('closed', () => {
      currentwidgetState = false;
      Avatar.Interface.ipcMain().removeHandler('marmiton-msg');
      Avatar.Interface.ipcMain().removeHandler('marmiton-save');
      Avatar.Interface.ipcMain().removeHandler('marmiton-recette');
      Avatar.Interface.ipcMain().removeAllListeners('marmiton-quit');
      recetteWindow = null;
   });
}

export async function afficheRecette(data, recettes) {
   const client = Avatar.getTrueClient(data.toClient);

   if (!recettes) {
      recettes = data.action.recettes;
   }

   if (!data.action.remote) {
      data.action.remote = true;

      Avatar.speak(Locale.get('tts.afficheRecette'), data.client, () => {
         Avatar.clientPlugin(client, 'marmiton', { action: { command: 'afficheRecette', recettes: recettes } });
      });
   } else {
      openRecetteWindow(recettes);
   }
}

export async function closeRecette(data, recettes) {
   const client = Avatar.getTrueClient(data.toClient);
   const remotePayload = {
      ...data,
      action: {
         ...data.action,
         command: closeRecette,
         recettes: recettes,
      },
   };

   // Cas local ou distant
   if (!data.action.remote) {
      // Exécution distante sur un autre client
      Avatar.speak(Locale.get('tts.closeRecette'), data.client, () => {
         data.action.remote = true;
         Avatar.clientPlugin(client, 'marmiton', remotePayload);
      });
   } else {
      openRecetteWindow(recettes);
   }
}
async function saveConfig(dataConfig) {
   const filePath = path.join(__dirname, 'marmiton.prop');

   try {
      if (!fs.existsSync(filePath)) {
         return error('Fichier marmiton.prop non trouvé !');
      }

      const rawData = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(rawData);

      jsonData.modules.marmiton.settings = dataConfig;

      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 3), 'utf8');
      Config.modules.marmiton = jsonData.modules.marmiton;

      infoGreen(`Mise à jour du fichier marmiton.prop`);
      return true;
   } catch (err) {
      return error('Erreur de mise à jour du fichier marmiton.prop');
   }
}

const extractCommands = (obj) => {
   const action = obj.value.action;
   const commands = action.split('=').slice(1);

   return commands.map((cmd) => {
      const [command, ...values] = cmd.split('~');
      return {
         command,
         value: values,
      };
   });
};
