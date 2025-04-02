import axios from 'axios';

let Config;

async function getPeriphCaract(id) {
   try {
      /*
		let url = 'http://.....';
		
		const response = await axios ({
			url: url,
			method: 'get',
			responseEncoding: 'binary',
			responseType: 'json'
		});

		if (response.status !== 200 || response.data.success === "0") {
			throw new Error (`Impossible de récupérer les caractéristiques du périphérique ${id}`)
		}

		return response.data.body;
		*/

      return {}; // FOR THE CREATION OF THE MODULE !!! Remove this line !!
   } catch (err) {
      error('getPeriphCaract marmiton function: ' + err);
   }
}

async function getPeriphValues(id) {
   try {
      /*
		let url = 'http://...';

		const response = await axios ({
			url: url,
			method: 'get',
			responseEncoding: 'binary',
			responseType: 'json'
		});

		if (response.status !== 200 || response.data.success === "0") {
			throw new Error (`Impossible de récupérer les informations du périphérique ${id}`)
		}

		return response.data.body;*/

      return {}; // FOR THE CREATION OF THE MODULE !!! Remove this line !!
   } catch (err) {
      error('getPeriphValues marmiton function: ' + err);
   }
}

async function set(id, value) {
   try {
      /*
		let url = 'http://.....';

		const response = await axios ({
			url: url,
			method: 'get',
			responseType: 'json'
		});

		if (response.status !== 200 || response.data.success === "0") {
			throw new Error (`Impossible d'exécuter l'action pour le périphérique ${id}`)
		}
		*/

      return;
   } catch (err) {
      error('set marmiton function: ' + err);
   }
}

async function macro(macro_id) {
   try {
      /*
		let url = 'http://....';
		
		const response = await axios ({
			url: url,
			method: 'get',
			responseType: 'json'
		});

		if (response.status !== 200 || response.data.success === "0") {
			throw new Error (`Impossible d'exécuter la macro ${macro_id}`)
		} */

      return;
   } catch (err) {
      error('macro marmiton function: ' + err);
   }
}

async function getPeriphInfos() {
   try {
      /*
		let url = 'http://.....';
		const response = await axios ({
			url: url,
			method: 'get',
			responseEncoding: 'binary',
			responseType: 'json'
		});

		if (response.status !== 200 || response.data.success === "0") {
			throw new Error ('Impossible de récupérer les informations des périphériques')
		}

		return response.data.body;*/

      return {}; // FOR THE CREATION OF THE MODULE !!! Remove this line !!
   } catch (err) {
      error('getPeriphInfos marmiton function: ' + err);
   }
}

var initVar = function (conf) {
   Config = conf.API;
};

async function init() {
   return {
      initVar: initVar,
      set: set,
      macro: macro,
      getPeriphCaract: getPeriphCaract,
      getPeriphValues: getPeriphValues,
      getPeriphInfos: getPeriphInfos,
   };
}

export { init };
