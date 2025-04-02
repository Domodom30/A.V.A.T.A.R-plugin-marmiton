const recipeContainer = document.querySelector('#recipe');
const btnClose = document.querySelector('#btn-close');
const labelTitle = document.querySelector('#label-title');
const notification = document.querySelector('#notification');
const btnPrev = document.querySelector('#btn-prev');
const btnNext = document.querySelector('#btn-next');
btnPrev.setAttribute('disabled', true);
// Variables globales
let allRecipes = [];
let currentIndex = 0;

// Fermeture fenêtre
window.onbeforeunload = async (e) => {
   e.returnValue = false;
   window.electronAPI.quit();
};

btnClose.addEventListener('click', () => {
   window.electronAPI.quit();
});

async function setTargets(config) {
   labelTitle.innerHTML = await Lget('label.recipe');
   btnClose.innerHTML = await Lget('label.close');
   btnPrev.innerHTML = await Lget('label.prev');
   btnNext.innerHTML = await Lget('label.next');
}

// Fonction pour afficher une recette avec transition
async function showRecipe(recipe, direction = 'right') {
   labelTitle.textContent = recipe.title;

   const html = `
       ${recipe.image ? `<img src="${recipe.image}" style="max-width: 100%; margin-bottom: 10px;" />` : ''}
       <p>
         <x-box><strong>Pour : </strong> <span id="person-count"> ${recipe.adjustedYield}</span>
         <x-numberinput id="person-input" value="${recipe.adjustedYieldNumber}"><x-stepper></x-stepper></x-numberinput></x-box>
       </p>
       <p><strong>Préparation :</strong> ${recipe.prepTime || '-'} |
          <strong>Cuisson :</strong> ${recipe.cookTime || '-'} |
          <strong>Total :</strong> ${recipe.totalTime || '-'}</p>
       <p><strong>Note :</strong> ${recipe.rating || 'N/A'} ⭐ (${recipe.ratingCount || 0} avis)</p>

       <h3>🧂 Ingrédients</h3>
       <ul id="ingredients-list">${recipe.adjustedIngredients.map((i) => `<li>${i}</li>`).join('')}</ul>

       <h3>👨‍🍳 Préparation</h3>
       <ol>${recipe.instructions.map((i) => `<li>${i}</li>`).join('')}</ol>
   `;

   const box = document.createElement('div');
   box.innerHTML = html;
   box.className = 'recipe-box';

   const old = recipeContainer.querySelector('div.recipe-box');

   if (old) {
      old.classList.add(direction === 'right' ? 'recipe-slide-out-left' : 'recipe-slide-out-right');
      await new Promise((r) => setTimeout(r, 300));
      old.remove();
   }

   box.classList.add(direction === 'right' ? 'recipe-slide-in-right' : 'recipe-slide-in-left');
   recipeContainer.appendChild(box);
   void box.offsetWidth;
   box.classList.remove('recipe-slide-in-left', 'recipe-slide-in-right');

   const personInput = box.querySelector('#person-input');
   const personCount = box.querySelector('#person-count');
   const ingredientsList = box.querySelector('#ingredients-list');

   if (personInput) {
      personInput.addEventListener('change', async () => {
         const newYield = personInput.value;
         if (!isNaN(newYield) && newYield > 0) {
            const updated = await window.electronAPI.recalculateIngredients(allRecipes, newYield);

            const matching = updated.find((r) => r.title === recipe.title);
            if (matching) {
               ingredientsList.innerHTML = matching.adjustedIngredients.map((i) => `<li class="updated">${i}</li>`).join('');

               personCount.textContent = newYield + ` ${recipe.yieldText}`;
               ingredientsList.querySelectorAll('li').forEach((li) => {
                  li.classList.add('updated');
                  setTimeout(() => li.classList.remove('updated'), 1500);
               });
            }
         }
      });
   }
}

const Lget = async (target, ...args) => {
   return await window.electronAPI.marmitonMsg(target, ...args);
};

function updateNavButtons() {
   if (currentIndex <= 0) {
      btnPrev.setAttribute('disabled', '');
   } else {
      btnPrev.removeAttribute('disabled');
   }

   if (currentIndex >= allRecipes.length - 1) {
      btnNext.setAttribute('disabled', '');
   } else {
      btnNext.removeAttribute('disabled');
   }
}

function showNavigationButtons() {
   updateNavButtons();
}

btnPrev.addEventListener('click', async () => {
   if (currentIndex > 0) {
      currentIndex--;
      await showRecipe(allRecipes[currentIndex], 'left');
      updateNavButtons();
   }
});

btnNext.addEventListener('click', async () => {
   if (currentIndex < allRecipes.length - 1) {
      currentIndex++;
      await showRecipe(allRecipes[currentIndex], 'right');
      updateNavButtons();
   }
});

// Chargement initial
window.electronAPI.onInitMarmiton(async (config, recettes) => {
   await setTargets(config);
   allRecipes = recettes;
   currentIndex = 0;
   if (!allRecipes) return;
   await showRecipe(allRecipes[currentIndex]);
   showNavigationButtons();
});
