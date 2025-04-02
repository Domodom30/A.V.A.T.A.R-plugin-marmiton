const btnClose = document.querySelector('#btn-close');
const btnSave = document.querySelector('#btn-save');
const labelTitle = document.querySelector('#label-title');
const inputNbRecettes = document.querySelector('#nb-recettes');
const labelNbRecettes = document.querySelector('#label-nb-recettes');
const inputNbPerson = document.querySelector('#nb-person');
const labelNbPerson = document.querySelector('#label-nb-person');
const notification = document.querySelector('#notification');
const labelSettingsInfo = document.querySelector('#label-settingsinfo');

const labelWidth = document.querySelector('#label-width');
const inputWidth = document.querySelector('#width');
const labelHeight = document.querySelector('#label-height');
const inputHeight = document.querySelector('#height');
const labelSize = document.querySelector('#label-size');

let dataConfig;

window.onbeforeunload = async (e) => {
   e.returnValue = false;
   window.electronAPI.quit();
};

async function setTargets(config) {
   labelTitle.innerHTML = await Lget('label.settings');
   labelNbRecettes.innerHTML = await Lget('label.nbRecettes');
   inputNbRecettes.value = config.settings.search.limit;
   labelNbPerson.innerHTML = await Lget('label.nbPerson');
   inputNbPerson.value = config.settings.search.nbperson;
   btnClose.innerHTML = await Lget('label.close');
   btnSave.innerHTML = await Lget('label.save');
   labelSettingsInfo.innerHTML = await Lget('label.settingsinfo');
   labelSize.innerHTML = await Lget('label.size');
   labelWidth.innerHTML = await Lget('label.width');
   inputWidth.value = config.settings.window.width;
   labelHeight.innerHTML = await Lget('label.height');
   inputHeight.value = config.settings.window.height;
}

btnClose.addEventListener('click', () => {
   window.electronAPI.quit();
});

btnSave.addEventListener('click', () => {
   saveDataConfig();
});

const Lget = async (target, ...args) => {
   return await window.electronAPI.marmitonMsg(target, ...args);
};

// Fonction pour afficher une notification
const showNotification = function (message, type) {
   notification.textContent = message;
   notification.classList.remove('hidden', 'warning', 'error', 'success');
   notification.classList.add('show');
   notification.classList.add(type);
   notification.style.display = 'block';
};

const saveDataConfig = async function () {
   const limit = inputNbRecettes.value;
   const nbperson = inputNbPerson.value;
   const witdh = inputWidth.value;
   const height = inputHeight.value;

   const data = {
      window: {
         width: witdh,
         height: height,
      },
      search: {
         limit: limit,
         nbperson: nbperson,
      },
   };
   const result = await window.electronAPI.marmitonSave(data);

   if (result) {
      showNotification('Sauvegarde éffectuée', 'success');
   } else {
      showNotification('Ereur dans la sauvegarde', 'error');
   }
};

window.electronAPI.onInitMarmiton(async (config) => {
   await setTargets(config);
});
