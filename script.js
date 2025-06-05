/* --- GLOBAL STATE & SETUP --- */
const steps = ['start','name','clients','systemPrompt','bio','lore','adjectives','knowledge','topics','messageExamples','style','chat','post','settings'];
let currentStep = 0;
let editingIndex = -1;
let characterData = {
  clients: [],
  bioSeed: "",
  bio: [],
  lore: [],
  adjectives: [],
  knowledge: [],
  topics: [],
  messageExamples: [],
  generalStyle: [], // New field for General Style
  chatStyle: [],    // New field for Chat Style
  postStyle: [],    // New field for Post Style
  color: null,
  name: "",
  apiKey: "",
  aiModel: "",
  apiProvider: "https://api.openai.com/v1/chat/completions",
  customModel: false,
  systemPrompt: ""
};
const availableColors = ["#FF5722","#4CAF50","#2196F3","#9C27B0","#E91E63","#009688","#FF9800","#795548"];
const systemPrompt = "You are a creative AI assistant. Output only lines, with no numbering or quotes.";
let nameSuggestionsLoaded = false;
let generalStyleSuggestionsLoaded = false;
let chatStyleSuggestionsLoaded = false;
let postStyleSuggestionsLoaded = false;

const systemPromptSuggestionsList = [
  "You are a financial advisor providing investment strategies to clients with varying levels of experience.",
  "You are a medieval knight recounting heroic tales from your time defending the realm.",
  "You are a mental health counselor offering supportive coping strategies in a calm, empathetic tone.",
  "You are a space explorer documenting alien life forms and reporting to mission control.",
  "You are a motivational speaker delivering short, energising insights to inspire positive change.",
  "You are a yoga instructor guiding users through a 10-minute mindfulness and breathing session.",
  "You are a historian specialising in ancient Egyptian myths and rituals, helping users explore lost knowledge.",
  "You are a trivia host who asks clever and engaging general knowledge questions, one at a time.",
  "You are a culinary expert offering fusion recipe ideas based on what ingredients a user has.",
  "You are a blockchain developer explaining smart contracts to non-technical founders.",
  "You are a photographer mentoring students on lighting and composition for outdoor portraits.",
  "You are a museum curator offering audio tour commentary on 20th-century abstract expressionism.",
  "You are a comedian who responds with quick one-liners and dry observational humour.",
  "You are a librarian who helps users find reliable information, citing trusted sources.",
  "You are a dream interpreter explaining subconscious symbols with creative, metaphorical insights."
];

function populateSystemPromptSuggestions() {
  const container = document.getElementById('systemPromptSuggestions');
  const inputField = document.getElementById('systemPromptInput');
  if (!container || !inputField) {
    console.error('System prompt suggestions container or input field not found.');
    return;
  }
  container.innerHTML = ''; // Clear previous suggestions

  const characterName = characterData.name ? characterData.name.trim() : null;

  systemPromptSuggestionsList.forEach(originalSuggestionText => {
    let finalSuggestionText = originalSuggestionText;
    if (characterName && characterName !== "") {
      let baseSuggestion = originalSuggestionText;
      // Remove "You are " prefix if it exists, to avoid "You are NAME, You are ..."
      if (baseSuggestion.toLowerCase().startsWith("you are ")) {
        baseSuggestion = baseSuggestion.substring(8); // Length of "You are "
      }
      finalSuggestionText = `You are ${characterName}, ${baseSuggestion}`;
    }

    const button = document.createElement('button');
    button.textContent = finalSuggestionText; 
    button.className = 'btn-sugg'; 

    button.onclick = () => {
      inputField.value = finalSuggestionText; 
      characterData.systemPrompt = finalSuggestionText; 
      
      document.querySelectorAll('#systemPromptSuggestions .btn-sugg').forEach(btn => btn.classList.remove('active-suggestion'));
      button.classList.add('active-suggestion');
      autoSave();
      updatePreview();
    };
    container.appendChild(button);
  });
}

// --- Info Carousel State ---
let currentInfoIndex = 0;
let infoItems = []; // Will be populated on DOMContentLoaded
let infoProgressEl = null; // Will be assigned in DOMContentLoaded
let prevInfoBtn = null;    // Will be assigned in DOMContentLoaded
let nextInfoBtn = null;    // Will be assigned in DOMContentLoaded

/* --- SUGGESTION HANDLING HELPERS --- */
function addSuggestionToStyleTextarea(suggestionText, textareaId, dataKey) {
  // Check if the style type is one that uses line-by-line input
  if (dataKey === 'generalStyle' || dataKey === 'chatStyle' || dataKey === 'postStyle') {
    if (!characterData[dataKey] || !Array.isArray(characterData[dataKey])) {
      characterData[dataKey] = [];
    }
    characterData[dataKey].push(suggestionText);
    updatePreview(); // Ensure instant preview update
    updateLineList(dataKey); // Refresh the displayed list for the specific style
    autoSave(); // This also calls updatePreview()
  } else {
    // Fallback or specific logic for styles that genuinely use a single large textarea
    const textarea = document.getElementById(textareaId);
    if (textarea) {
      // Add a newline before the suggestion if the textarea is not empty
      const currentText = textarea.value.trim();
      textarea.value += (currentText ? '\n' : '') + suggestionText;
      
      // Update characterData by splitting the textarea content into an array of lines
      if (characterData[dataKey] !== undefined) { // Ensure the key exists
        characterData[dataKey] = textarea.value.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      }
      autoSave();
    } else {
      console.warn(`Textarea with ID '${textareaId}' not found for dataKey '${dataKey}', and it's not a known line-based style.`);
    }
  }
}

// Make displaySuggestions globally available
window.displaySuggestions = function(suggestions, containerId, styleType) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Suggestion container '${containerId}' not found.`);
        return;
    }
    container.innerHTML = ''; // Clear loading/previous suggestions

    if (!suggestions || suggestions.length === 0) {
        container.innerHTML = '<span class="no-suggestions">No suggestions available. Try adjusting character details or try again.</span>';
        return;
    }

    suggestions.forEach(suggestion => {
        const button = document.createElement('button');
        button.textContent = suggestion;
        button.className = 'btn-sugg'; // Changed from 'suggestion-button' for styling consistency
        
        let textareaId = '';
        let dataKey = '';

        switch (styleType) {
            case 'general':
                textareaId = 'generalStyleTextarea';
                dataKey = 'generalStyle';
                break;
            case 'chat':
                textareaId = 'chatStyleTextarea';
                dataKey = 'chatStyle';
                break;
            case 'post':
                textareaId = 'postStyleTextarea';
                dataKey = 'postStyle';
                break;
            default:
                console.error('Unknown styleType for suggestion:', styleType);
                return; // Don't create a button if styleType is invalid
        }

        button.onclick = () => addSuggestionToStyleTextarea(suggestion, textareaId, dataKey);
        container.appendChild(button);
    });
}

/* --- AUTO-SAVE FUNCTIONS --- */
function autoSave() {
  localStorage.setItem('autosave', JSON.stringify(characterData));
}
document.addEventListener("DOMContentLoaded", function() {
  if (localStorage.getItem('characterData')) {
    characterData = JSON.parse(localStorage.getItem('characterData'));
    // Migration for old 'style' object structure
    if (characterData.style && typeof characterData.style === 'object') {
      characterData.generalStyle = characterData.style.all || [];
      characterData.chatStyle = characterData.style.chat || [];
      characterData.postStyle = characterData.style.post || [];
      delete characterData.style; // Remove the old structure
    }
    // Ensure new fields exist
    if (!characterData.generalStyle) characterData.generalStyle = [];
    if (!characterData.chatStyle) characterData.chatStyle = [];
    if (!characterData.postStyle) characterData.postStyle = [];
    if (!characterData.messageExamples) characterData.messageExamples = []; // Ensure this exists too
    if (!characterData.systemPrompt) characterData.systemPrompt = ""; // Ensure systemPrompt exists

    updatePreview();
  }
  
  // Initialize model options based on provider
  updateModelOptions();
  
  // Attach "Enter" key listeners for add-line inputs (removed styleallLine, stylechatLine, stylepostLine)
  const addLineInputs = [
    { id: "bioLine", fn: () => addLine("bio") },
    { id: "loreLine", fn: () => addLine("lore") },
    { id: "adjectivesLine", fn: () => addLine("adjectives") },
    { id: "knowledgeLine", fn: () => addLine("knowledge") },
    { id: "topicsLine", fn: () => addLine("topics") }
  ];
  addLineInputs.forEach(item => {
    const input = document.getElementById(item.id);
    if(input) {
      input.addEventListener("keydown", function(e) {
        if(e.key === "Enter") {
          e.preventDefault();
          item.fn();
        }
      });
    }
  }); // End of addLineInputs.forEach

  // Event listener for 'Enter' key on bioSeed input
  const bioSeedInput = document.getElementById('bioSeed');
  if (bioSeedInput) {
    bioSeedInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent default form submission or other 'Enter' behavior
        // Ensure characterData.bioSeed is up-to-date from the input field before generating suggestions
        characterData.bioSeed = bioSeedInput.value.trim(); 
        if (typeof populateBioSuggestions === 'function') {
            populateBioSuggestions();
        }
        autoSave(); // autoSave also updates preview implicitly if characterData changed
      }
    });
  }


  // Event listener for General Style line input
  const generalStyleLineInput = document.getElementById('generalStyleLine');
  if (generalStyleLineInput) {
    generalStyleLineInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default form submission
        addLine('generalStyle');
        autoSave(); 
      }
    });
  }

  // Event listeners for new style suggestion buttons
  const getGeneralStyleSuggestionsBtn = document.getElementById('getGeneralStyleSuggestionsBtn');
  if (getGeneralStyleSuggestionsBtn) {
    getGeneralStyleSuggestionsBtn.addEventListener('click', initiateGeneralStyleSuggestionsLoad);
  }

  const getChatStyleSuggestionsBtn = document.getElementById('getChatStyleSuggestionsBtn');
  if (getChatStyleSuggestionsBtn) {
    getChatStyleSuggestionsBtn.addEventListener('click', initiateChatStyleSuggestionsLoad);
  }

  const getPostStyleSuggestionsBtn = document.getElementById('getPostStyleSuggestionsBtn');
  if (getPostStyleSuggestionsBtn) {
    getPostStyleSuggestionsBtn.addEventListener('click', initiatePostStyleSuggestionsLoad);
  }

  // Initial population of UI from data (if any)
  // This needs to happen after all event listeners for dynamic elements are set up,
  // and after characterData is potentially loaded from localStorage.
  populateUIFromCharacterData();
  // Show the initial step (which might trigger auto-suggestions)
  showStep();
  // Initial preview update
  updatePreview();

  const downloadBtn = document.getElementById('downloadCharacterBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', exportCharacter);
  }

  // Info Carousel Initialization
  const carousel = document.querySelector('.info-carousel');
  if (carousel) {
    infoItems = Array.from(carousel.querySelectorAll('.info-item'));
    // Assign DOM elements now that they exist
    infoProgressEl = document.getElementById('infoProgress');
    prevInfoBtn = document.getElementById('prevInfoBtn');
    nextInfoBtn = document.getElementById('nextInfoBtn');

    if (infoItems.length > 0) {
      // Ensure DOM elements for navigation are found before proceeding
      if (infoProgressEl && prevInfoBtn && nextInfoBtn) {
        showInfoItem(currentInfoIndex); // Show the first item

        prevInfoBtn.addEventListener('click', () => {
          if (currentInfoIndex > 0) {
            currentInfoIndex--;
            showInfoItem(currentInfoIndex);
          }
        });

        nextInfoBtn.addEventListener('click', () => {
          if (currentInfoIndex < infoItems.length - 1) {
            currentInfoIndex++;
            showInfoItem(currentInfoIndex);
          }
        });
      } else {
        console.warn("One or more info carousel navigation elements (progress, prev, next) not found.");
        const infoNavigation = carousel.querySelector('.info-navigation');
        if (infoNavigation) {
            infoNavigation.style.display = 'none'; // Hide nav if controls are missing
        }
      }
    } else {
        // console.warn("No info items found in the carousel.");
        const infoNavigation = carousel.querySelector('.info-navigation');
        if (infoNavigation) {
            infoNavigation.style.display = 'none';
        }
    }
  } else {
    // console.warn("Info carousel container not found on this screen. This is normal if not on the 'start' screen.");
  }
}); // End of DOMContentLoaded

/* --- EXPORT/IMPORT FUNCTIONS --- */
function exportCharacter() {
  // Create a temporary object for export to avoid modifying original characterData
  const tempExportData = { ...characterData };

  // Remove fields not intended for direct export or that are handled differently
  delete tempExportData.apiKey;         // Remove the API key used for suggestions
  delete tempExportData.apiProvider;    // This is mapped to modelProvider
  delete tempExportData.customModel;    // Internal flag, model name is in aiModel
  delete tempExportData.bioSeed;        // bioSeed is for generation, not export
  // systemPrompt is mapped to 'system' below
  // aiModel is mapped to 'settings.model' below
  // voiceModel is mapped to 'settings.voice.model' below

  const exportData = {
    name: tempExportData.name,
    clients: tempExportData.clients || [],
    modelProvider: characterData.apiProvider || "openai", // Use apiProvider from characterData for modelProvider
    system: characterData.systemPrompt || `You are ${characterData.name || 'AI Assistant'}, an AI agent.`,
    settings: {
      model: characterData.aiModel || "", // Ensure aiModel is included
      voice: {
        model: characterData.voiceModel || "" // Ensure voiceModel is included, default to empty if not set
      }
      // any other settings from tempExportData.settings can be merged here if needed
    },
    plugins: tempExportData.plugins || [],
    bio: tempExportData.bio || [],
    lore: tempExportData.lore || [],
    adjectives: tempExportData.adjectives || [],
    knowledge: tempExportData.knowledge || [],
    topics: tempExportData.topics || [],
    messageExamples: tempExportData.messageExamples || [],
    postExamples: tempExportData.postExamples || [], 
    generalStyle: tempExportData.generalStyle || [],
    chatStyle: tempExportData.chatStyle || [],
    postStyle: tempExportData.postStyle || [],
    color: tempExportData.color,
    secrets: {} // Add the blank secrets object
  };

  // Clean up undefined or null values to avoid them in JSON unless explicitly desired
  for (const key in exportData) {
    if (exportData[key] === undefined || exportData[key] === null) {
      if (Array.isArray(exportData[key])) { // Ensure arrays are empty not null
        exportData[key] = [];
      } else if (typeof exportData[key] === 'object' && key !== 'secrets' && key !== 'settings') { // Ensure objects are empty not null (except secrets/settings)
        exportData[key] = {};
      }
      // For simple string/number fields, null might be acceptable or should be empty string
      // For now, this keeps nulls for non-array/object fields if they were explicitly set to null
    }
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", (exportData.name || "character") + ".json");
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function importCharacter(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      // Save the current API settings before importing
      const apiSettings = {
        apiKey: characterData.apiKey || "",
        apiProvider: characterData.apiProvider || "https://api.openai.com/v1/chat/completions",
        aiModel: characterData.aiModel || "",
        customModel: characterData.customModel || false
      };
      
      const importedData = JSON.parse(e.target.result);
      // Merge imported data first
      characterData = { ...characterData, ...importedData };

      // Migrate from old 'style' object if present in importedData
      if (importedData.style && typeof importedData.style === 'object') {
        characterData.generalStyle = importedData.style.all || [];
        characterData.chatStyle = importedData.style.chat || [];
        characterData.postStyle = importedData.style.post || [];
        delete characterData.style; // Remove the old structure from the merged data
      }
      // Ensure new fields exist if not provided or migrated
      if (!characterData.generalStyle) characterData.generalStyle = [];
      if (!characterData.chatStyle) characterData.chatStyle = [];
      if (!characterData.postStyle) characterData.postStyle = [];
      if (!characterData.messageExamples) characterData.messageExamples = [];
      
      // Preserve API settings
      characterData.apiKey = apiSettings.apiKey;
      characterData.apiProvider = apiSettings.apiProvider;
      characterData.aiModel = apiSettings.aiModel;
      characterData.customModel = apiSettings.customModel;
      
      updatePreview();
      populateUIFromCharacterData(); // This will need to be updated to load new style fields
      
      // If no API key is set, start at the start screen
      // Otherwise, start at the name screen
      if(characterData.apiKey) {
        validateApiKey().then(result => {
          if (result.valid) {
            currentStep = 1;
          } else {
            currentStep = 0;
          }
          showStep();
        });
      } else {
        currentStep = 0;
        showStep();
      }
      
      autoSave();
    } catch (err) {
      alert("Failed to import file: " + err.message);
    }
  }
  reader.readAsText(file);
}

/* --- Helper function for toggling "other" fields --- */
function toggleOther(field) {
  const selectEl = document.getElementById(field);
  const otherEl = document.getElementById(field + "Other");
  if(selectEl.value === "other") {
    otherEl.style.display = "block";
  } else {
    otherEl.style.display = "none";
  }
}

/* --- Function to update model options based on selected provider --- */
function updateModelOptions() {
  const provider = document.getElementById('apiProvider').value;
  const openaiModels = document.getElementById('openaiModels');
  const groqModels = document.getElementById('groqModels');
  const customModel = document.getElementById('customModel');
  const apiProviderOther = document.getElementById('apiProviderOther');
  
  // Hide all model containers first
  openaiModels.style.display = 'none';
  groqModels.style.display = 'none';
  customModel.style.display = 'none';
  apiProviderOther.style.display = 'none';
  
  // Show the appropriate container based on the selected provider
  if (provider === 'https://api.openai.com/v1/chat/completions') {
    openaiModels.style.display = 'block';
    document.getElementById('aiModel').value = 'gpt-4-turbo-2024-04-09'; // Set default
    characterData.customModel = false;
  } else if (provider === 'https://api.groq.com/openai/v1/chat/completions') {
    groqModels.style.display = 'block';
    characterData.customModel = false;
  } else if (provider === 'other') {
    customModel.style.display = 'block';
    apiProviderOther.style.display = 'block';
    characterData.customModel = true;
  }
  
  autoSave();
}

/* --- TOGGLE SUPPORTED CLIENTS --- */
function toggleClient(checkbox) {
  const val = checkbox.value;
  if (checkbox.checked) {
    if (!characterData.clients.includes(val)) {
      characterData.clients.push(val);
    }
  } else {
    const idx = characterData.clients.indexOf(val);
    if (idx !== -1) {
      characterData.clients.splice(idx, 1);
    }
  }
  updatePreview();
  autoSave();
}

/* --- NAVIGATION & PREVIEW --- */
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById('screen-' + steps[currentStep])) {
    showStep();
  }
  updatePreview();
  updateCastBar();
  document.querySelectorAll('.step').forEach((el, idx) => {
    el.addEventListener('click', () => {
      currentStep = idx;
      showStep();
      updatePreview();
    });
  });
  const castBar = document.getElementById('castBar');
  // The initial state of the toggle button is now set in index.html.
  // toggleCastBar() function will handle changes.

  const castTitleToggleElement = document.getElementById('castTitleToggle');
  if (castTitleToggleElement) {
    castTitleToggleElement.addEventListener('click', toggleCastBar);
  }
});

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    showStep();
    updatePreview(); // Ensure preview updates when going back
    autoSave(); // Optionally save the state of the step we are navigating away from
  }
}

function showStep() {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  const stepId = 'screen-' + steps[currentStep];
  const stepElement = document.getElementById(stepId);
  if (stepElement) {
    stepElement.classList.add('active');
  } else {
    console.error(`%c   showStep: FAILED to find screen element with ID: '${stepId}' for currentStep index ${currentStep}`, 'color: red; font-weight: bold;');
  }
  updateSidebar();
  
  // Update model options if we're on the start screen
  if (steps[currentStep] === 'start') {
    updateModelOptions();
  }
  
  autoTriggerSuggestions();
  if (steps[currentStep] === 'systemPrompt') {
    populateSystemPromptSuggestions();
  }
  window.scrollTo(0, 0);
}

// Helper function to escape HTML to prevent XSS
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, function (match) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match];
  });
}

function updatePreview() {
  let errorOccurred = false;
  const previewIcon = document.getElementById('previewIcon');
  const previewContent = document.getElementById('previewContent');

  if (!previewIcon || !previewContent) {
    console.warn('Preview elements not found. Skipping preview update.');
    return;
  }

  let contentHTML = '';
  let detailsAdded = false; // Flag to track if any details beyond name/bioseed are added

  // Character Name
  if (characterData.name) {
    contentHTML += `<h3>${escapeHTML(characterData.name)}</h3>`;
  } else {
    contentHTML += `<h3>Unnamed Character</h3>`;
  }

  // System Prompt
  if (characterData.systemPrompt && characterData.systemPrompt.trim() !== '') {
    contentHTML += `<h4>System Prompt</h4><p><em>${escapeHTML(characterData.systemPrompt)}</em></p>`;
    detailsAdded = true; // Mark that details were added
  }

  const previewableFields = [
    { key: 'clients', label: 'Supported Clients' },
    { key: 'bio', label: 'Bio Lines' },
    { key: 'lore', label: 'Lore' },
    { key: 'adjectives', label: 'Adjectives' },
    { key: 'knowledge', label: 'Knowledge Base' },
    { key: 'topics', label: 'Key Topics' },
    { key: 'generalStyle', label: 'General Style Notes' },
    { key: 'chatStyle', label: 'Chat Style Notes' },
    { key: 'postStyle', label: 'Post Style Notes' },
    { key: 'messageExamples', label: 'Message Examples' }
  ];

  previewableFields.forEach(field => {
    const data = characterData[field.key];
    if (data && ((Array.isArray(data) && data.length > 0) || (typeof data === 'string' && data.trim() !== ''))) {
      detailsAdded = true;
      contentHTML += `<h4>${escapeHTML(field.label)}</h4>`;
      if (Array.isArray(data)) {
        contentHTML += '<ul>';
        data.forEach(item => {
          // For messageExamples, item is an object {role: 'user/assistant', content: '...'}
          if (field.key === 'messageExamples' && typeof item === 'object' && item.content) {
            contentHTML += `<li><strong>${escapeHTML(item.role || 'message')}:</strong> ${escapeHTML(item.content)}</li>`;
          } else if (typeof item === 'string') {
            contentHTML += `<li>${escapeHTML(item)}</li>`;
          }
        });
        contentHTML += '</ul>';
      } else if (typeof data === 'string') { // For simple string fields, if any in future
        contentHTML += `<p>${escapeHTML(data)}</p>`;
      }
    }
  });

  // Only show placeholder if no specific details were added
  if (!detailsAdded) {
    contentHTML += `<p class="preview-details-placeholder"><em>(More details will appear here as you fill them in...)</em></p>`;
  }

  // Ensure the preview icon element is cleared
  if (previewIcon) {
    previewIcon.innerHTML = '';
  }

  previewContent.innerHTML = contentHTML;
}

function addLine(fieldType) {
  const inputElementId = `${fieldType}Line`; // e.g., bioLine, loreLine
  const inputElement = document.getElementById(inputElementId);

  if (!inputElement) {
    console.warn(`Input element '${inputElementId}' not found for field type ${fieldType}.`);
    return;
  }

  const value = inputElement.value.trim();

  if (value) {
    if (!characterData[fieldType] || !Array.isArray(characterData[fieldType])) {
      characterData[fieldType] = []; // Initialize if it doesn't exist or isn't an array
    }
    characterData[fieldType].push(value);
    updatePreview(); // Ensure instant preview update
    updateLineList(fieldType); // Refresh the list display
    inputElement.value = ''; // Clear the input field
    autoSave(); // Save changes
  }
}

function updateLineList(fieldType) {
  const containerId = `${fieldType}Lines`; // e.g., bioLines, loreLines
  const container = document.getElementById(containerId);

  if (!container) {
    console.warn(`Container element '${containerId}' not found. Skipping line list update for ${fieldType}.`);
    return;
  }

  container.innerHTML = ''; // Clear existing lines

  const lines = characterData[fieldType] || [];

  if (lines.length === 0) {
    container.innerHTML = `<p class="empty-list-placeholder"><em>No ${fieldType} lines added yet.</em></p>`;
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'line-list'; // For potential styling

  lines.forEach((line, index) => {
    const li = document.createElement('li');
    li.className = 'line-item';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = line;
    textSpan.className = 'line-text-display'; // For styling and targeting
    textSpan.onclick = (event) => { makeLineEditable(fieldType, index, li, textSpan, event); };
    li.appendChild(textSpan);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '[x]';
    deleteButton.className = 'btn-delete-line';
    deleteButton.onclick = function() {
      removeLine(fieldType, index);
    };
    li.appendChild(deleteButton);
    
    ul.appendChild(li);
  });

  container.appendChild(ul);

  new Sortable(ul, {
    animation: 150, // ms, animation speed moving items when sorting, `0` — without animation
    ghostClass: 'sortable-ghost', // Class name for the drop placeholder (optional styling)
    handle: '.line-item', // Restrict drag start to items themselves
    onEnd: function (evt) {
      // evt.oldIndex and evt.newIndex are the old and new positions
      if (characterData[fieldType] && characterData[fieldType].length > 1) {
        const movedItem = characterData[fieldType].splice(evt.oldIndex, 1)[0];
        characterData[fieldType].splice(evt.newIndex, 0, movedItem);
        updatePreview(); // Ensure instant preview update
        autoSave(); // Save the new order
      }
    }
  });
}

function makeLineEditable(fieldType, index, listItem, textSpanElement, event) {
  event.stopPropagation(); // Prevent event bubbling, e.g., to drag functionality

  // Check if an edit is already in progress for this item
  if (listItem.querySelector('input.edit-line-input')) {
    return; // Already editing this item
  }

  const originalText = characterData[fieldType][index];

  // Create input field
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-line-input';
  input.value = originalText;

  // Create Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.className = 'btn-save-edit';

  // Create Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.className = 'btn-cancel-edit';

  // Temporarily remove the original text span and delete button
  // const deleteButtonOriginal = listItem.querySelector('.btn-delete-line'); // We'll re-add it via updateLineList
  listItem.innerHTML = ''; // Clear the list item

  // Add new elements
  listItem.appendChild(input);
  listItem.appendChild(saveButton);
  listItem.appendChild(cancelButton);
  input.focus();

  // --- Event Handlers for Save/Cancel ---
  const saveEdit = () => {
    const newValue = input.value.trim();
    if (newValue) {
      characterData[fieldType][index] = newValue;
    } else {
      // If the new value is empty, remove the line
      characterData[fieldType].splice(index, 1);
    }
    updateLineList(fieldType); // Redraw the list for this type
    updatePreview();
    autoSave();
  };

  const cancelEdit = () => {
    updateLineList(fieldType); // Redraw, discarding changes
  };

  saveButton.onclick = saveEdit;
  cancelButton.onclick = cancelEdit;

  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };
  
  // Ensure clicking outside the edit area cancels the edit
  input.addEventListener('blur', (e) => {
    // Check if the blur was to the save or cancel button
    if (e.relatedTarget !== saveButton && e.relatedTarget !== cancelButton) {
        // Small delay to allow save/cancel button clicks to register
        setTimeout(cancelEdit, 100); 
    }
  });
}

function removeLine(fieldType, index) {
  if (characterData[fieldType] && characterData[fieldType][index] !== undefined) {
    characterData[fieldType].splice(index, 1);
    updateLineList(fieldType); // Refresh the list
    autoSave(); // Save changes
  }
}

function addMessageExample() {
  const userTextarea = document.getElementById('messageExampleUser');
  const characterTextarea = document.getElementById('messageExampleCharacter');

  if (!userTextarea || !characterTextarea) {
    console.error('Message example textareas not found.');
    return;
  }

  const userSays = userTextarea.value.trim();
  const characterSays = characterTextarea.value.trim();

  if (userSays && characterSays) {
    if (!characterData.messageExamples) {
      characterData.messageExamples = [];
    }
    // Add as a pair of objects
    characterData.messageExamples.push({ role: 'user', content: userSays });
    characterData.messageExamples.push({ role: 'assistant', content: characterSays });

    userTextarea.value = '';
    characterTextarea.value = '';

    updatePreview(); // Ensure instant preview update
    updateMessageExamplesUI();
    autoSave(); // This also calls updatePreview()
  } else {
    alert('Please fill in both what the user says and what the character responds.');
  }
}

function updateMessageExamplesUI() {
  const container = document.getElementById('messageExamplesContainer');
  if (!container) {
    console.warn('messageExamplesContainer not found.');
    return;
  }
  container.innerHTML = ''; // Clear existing examples

  if (!characterData.messageExamples || characterData.messageExamples.length === 0) {
    container.innerHTML = '<p class="empty-list-placeholder"><em>No message examples added yet.</em></p>';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'line-list'; // Use existing styling for consistency

  // Process examples in pairs (user, assistant)
  for (let i = 0; i < characterData.messageExamples.length; i += 2) {
    const userMsg = characterData.messageExamples[i];
    const assistantMsg = characterData.messageExamples[i + 1];

    // Ensure we have a pair and they have the expected roles
    if (userMsg && userMsg.role === 'user' && assistantMsg && assistantMsg.role === 'assistant') {
      const li = document.createElement('li');
      li.className = 'line-item message-example-item'; // Add specific class for potential styling

      const textDiv = document.createElement('div');
      textDiv.className = 'message-example-text';
      // Display character name if available, otherwise 'Character'
      const characterNameForDisplay = characterData.name ? escapeHTML(characterData.name) : 'Character';
      textDiv.innerHTML = `<strong>User:</strong> ${escapeHTML(userMsg.content)}<br><strong>${characterNameForDisplay}:</strong> ${escapeHTML(assistantMsg.content)}`;
      textDiv.onclick = (event) => { makeMessageExampleEditable(i, li, textDiv, event); }; // Pass 'i' (pairIndex), 'li', and 'textDiv'
      li.appendChild(textDiv);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = '[x]';
      deleteButton.className = 'btn-delete-line'; // Use existing styling
      deleteButton.onclick = function() {
        removeMessageExamplePair(i); // Pass the index of the user message
      };
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'line-item-actions';

      const upButton = document.createElement('button');
      upButton.innerHTML = '▲'; // Up arrow
      upButton.className = 'btn-reorder btn-up';
      upButton.title = 'Move example up';
      upButton.onclick = function() { moveMessagePair(i, 'up'); };
      if (i === 0) {
        upButton.disabled = true;
      }
      actionsDiv.appendChild(upButton);

      const downButton = document.createElement('button');
      downButton.innerHTML = '▼'; // Down arrow
      downButton.className = 'btn-reorder btn-down';
      downButton.title = 'Move example down';
      downButton.onclick = function() { moveMessagePair(i, 'down'); };
      if (i >= characterData.messageExamples.length - 2) {
        downButton.disabled = true;
      }
      actionsDiv.appendChild(downButton);

      actionsDiv.appendChild(deleteButton);
      li.appendChild(actionsDiv);
      ul.appendChild(li);
    } else {
      // Log if an unexpected item or structure is found, to help debug if necessary
      console.warn('Skipping malformed message example item at index:', i, characterData.messageExamples[i], characterData.messageExamples[i+1]);
    }
  }
  container.appendChild(ul);
}

function moveMessagePair(pairIndex, direction) {
  const examples = characterData.messageExamples;
  const pairLength = 2; // Each pair consists of a user and an assistant message

  if (direction === 'up' && pairIndex > 0) {
    // Swap the current pair (userMsg, assistantMsg) with the pair above it
    const userMsgCurrent = examples[pairIndex];
    const assistantMsgCurrent = examples[pairIndex + 1];
    const userMsgAbove = examples[pairIndex - pairLength];
    const assistantMsgAbove = examples[pairIndex - pairLength + 1];

    examples[pairIndex - pairLength] = userMsgCurrent;
    examples[pairIndex - pairLength + 1] = assistantMsgCurrent;
    examples[pairIndex] = userMsgAbove;
    examples[pairIndex + 1] = assistantMsgAbove;

  } else if (direction === 'down' && pairIndex < examples.length - pairLength) {
    // Swap the current pair with the pair below it
    const userMsgCurrent = examples[pairIndex];
    const assistantMsgCurrent = examples[pairIndex + 1];
    const userMsgBelow = examples[pairIndex + pairLength];
    const assistantMsgBelow = examples[pairIndex + pairLength + 1];

    examples[pairIndex + pairLength] = userMsgCurrent;
    examples[pairIndex + pairLength + 1] = assistantMsgCurrent;
    examples[pairIndex] = userMsgBelow;
    examples[pairIndex + 1] = assistantMsgBelow;
  } else {
    // Invalid move (e.g., trying to move first item up or last item down)
    console.warn('Invalid move attempted for message example pair at index:', pairIndex, 'direction:', direction);
    return; // Do nothing if the move is invalid
  }

  updateMessageExamplesUI(); // Refresh the UI to show the new order
  autoSave(); // Save the changes
}

function makeMessageExampleEditable(pairIndex, listItem, textDisplayDiv, event) {
  event.stopPropagation();

  if (listItem.querySelector('textarea.edit-user-input')) {
    return; // Already editing this item
  }

  const originalUserContent = characterData.messageExamples[pairIndex].content;
  const originalAssistantContent = characterData.messageExamples[pairIndex + 1].content;

  // Create Textareas
  const userInput = document.createElement('textarea');
  userInput.className = 'edit-user-input';
  userInput.value = originalUserContent;
  userInput.rows = 2;

  const assistantInput = document.createElement('textarea');
  assistantInput.className = 'edit-assistant-input';
  assistantInput.value = originalAssistantContent;
  assistantInput.rows = 3;

  // Create Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.className = 'btn-save-edit'; // Use existing style

  // Create Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.className = 'btn-cancel-edit'; // Use existing style
  
  listItem.innerHTML = ''; // Clear the list item

  const editFieldsDiv = document.createElement('div');
  editFieldsDiv.className = 'message-example-edit-fields';
  
  const userLabel = document.createElement('label');
  userLabel.textContent = 'User:';
  editFieldsDiv.appendChild(userLabel);
  editFieldsDiv.appendChild(userInput);
  
  const assistantLabel = document.createElement('label');
  const characterNameForDisplay = characterData.name ? escapeHTML(characterData.name) : 'Character';
  assistantLabel.textContent = `${characterNameForDisplay}:`;
  editFieldsDiv.appendChild(assistantLabel);
  editFieldsDiv.appendChild(assistantInput);

  listItem.appendChild(editFieldsDiv);

  const editControlsDiv = document.createElement('div');
  editControlsDiv.className = 'message-example-edit-controls';
  editControlsDiv.appendChild(saveButton);
  editControlsDiv.appendChild(cancelButton);
  listItem.appendChild(editControlsDiv);
  
  userInput.focus();

  const saveEdit = () => {
    const newUserValue = userInput.value; // Keep trim for actual save, not for intermediate display
    const newAssistantValue = assistantInput.value;

    // Update data - consider if empty strings are valid or should remove the pair
    characterData.messageExamples[pairIndex].content = newUserValue.trim();
    characterData.messageExamples[pairIndex + 1].content = newAssistantValue.trim();

    // If both become empty after trimming, remove the pair
    if (newUserValue.trim() === '' && newAssistantValue.trim() === '') {
        characterData.messageExamples.splice(pairIndex, 2);
    }

    updateMessageExamplesUI();
    updatePreview();
    autoSave();
  };

  const cancelEdit = () => {
    updateMessageExamplesUI();
  };

  saveButton.onclick = saveEdit;
  cancelButton.onclick = cancelEdit;

  const handleKeydown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { 
      e.preventDefault(); // Prevent default Enter behavior in textarea
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };
  userInput.onkeydown = handleKeydown;
  assistantInput.onkeydown = handleKeydown;
  
  const inputs = [userInput, assistantInput];
  inputs.forEach(input => {
    input.addEventListener('blur', (e) => {
      if (e.relatedTarget !== saveButton && e.relatedTarget !== cancelButton && !inputs.includes(e.relatedTarget)) {
        setTimeout(cancelEdit, 100); // Delay to allow button clicks
      }
    });
  });
}

function removeMessageExamplePair(startIndex) {
  // Remove both user and assistant messages (2 items)
  if (characterData.messageExamples && characterData.messageExamples.length > startIndex + 1) {
    characterData.messageExamples.splice(startIndex, 2);
    updateMessageExamplesUI();
    autoSave(); // This also calls updatePreview()
  }
}

function updateSidebar() {
  document.querySelectorAll('.step').forEach((el, idx) => {
    el.classList.toggle('active', idx === currentStep);
  });
}

function showInfoItem(index) {
  if (!infoItems || !infoItems.length) { 
    // console.warn("Info items not initialized or empty during showInfoItem call.");
    return;
  }

  infoItems.forEach((item, i) => {
    item.classList.remove('active-info');
    if (i === index) {
      item.classList.add('active-info');
    }
  });

  if (infoProgressEl) {
    infoProgressEl.textContent = `${index + 1}/${infoItems.length}`;
  } else {
    // console.warn("infoProgressEl not found for update during showInfoItem call.");
  }

  if (prevInfoBtn) {
    prevInfoBtn.disabled = index === 0;
  } else {
    // console.warn("prevInfoBtn not found for state update during showInfoItem call.");
  }

  if (nextInfoBtn) {
    nextInfoBtn.disabled = index === infoItems.length - 1;
  } else {
    // console.warn("nextInfoBtn not found for state update during showInfoItem call.");
  }
}

// Functions to initiate loading of style suggestions (will call gpt.js functions)
function initiateGeneralStyleSuggestionsLoad() {
  const container = document.getElementById('generalStyleSuggestions');
  if (container) container.innerHTML = '<span class="loading-suggestions"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</span>';
  if (typeof getAndDisplayGeneralStyleSuggestions === 'function') {
    getAndDisplayGeneralStyleSuggestions();
  } else {
    console.error('getAndDisplayGeneralStyleSuggestions function not found');
    if (container) container.innerHTML = '<span class="error-suggestions">Error loading suggestions.</span>';
  }
}

function initiateChatStyleSuggestionsLoad() {
  const container = document.getElementById('chatStyleSuggestions');
  if (container) container.innerHTML = '<span class="loading-suggestions"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</span>';
  if (typeof getAndDisplayChatStyleSuggestions === 'function') {
    getAndDisplayChatStyleSuggestions(); // This function will be in gpt.js
  } else {
    console.warn('getAndDisplayChatStyleSuggestions function not yet implemented in gpt.js');
    if (container) container.innerHTML = '<span class="error-suggestions">Suggestion feature not fully implemented yet.</span>';
  }
}

function initiatePostStyleSuggestionsLoad() {
  const container = document.getElementById('postStyleSuggestions');
  if (container) container.innerHTML = '<span class="loading-suggestions"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</span>';
  if (typeof getAndDisplayPostStyleSuggestions === 'function') {
    getAndDisplayPostStyleSuggestions(); // This function will be in gpt.js
  } else {
    console.warn('getAndDisplayPostStyleSuggestions function not yet implemented in gpt.js');
    if (container) container.innerHTML = '<span class="error-suggestions">Suggestion feature not fully implemented yet.</span>';
  }
}

// autoTriggerSuggestions calls functions from gpt.js or the initiate functions above
function autoTriggerSuggestions() {
  const step = steps[currentStep];
  if (step === 'name' && !nameSuggestionsLoaded) {
    nameSuggestionsLoaded = true;
    const container = document.getElementById("nameSuggestions");
    if (!container.innerHTML.trim()) populateNameSuggestions();
  }
  if (step === 'bio') {
    const container = document.getElementById("bioSuggestions");
    if (!container.innerHTML.trim()) populateBioSuggestions();
  }
  if (step === 'lore') {
    const container = document.getElementById("loreSuggestions");
    if (!container.innerHTML.trim()) populateLoreSuggestions();
  }
  if (step === 'adjectives') {
    const container = document.getElementById("adjectivesSuggestions");
    if (!container.innerHTML.trim()) populateAdjectivesSuggestions();
  }
  if (step === 'knowledge') {
    const container = document.getElementById("knowledgeSuggestions");
    if (!container.innerHTML.trim()) populateKnowledgeSuggestions();
  }
  if (step === 'topics') {
    const container = document.getElementById("topicsSuggestions");
    if (!container.innerHTML.trim()) populateTopicsSuggestions();
  }
  if (step === 'messageExamples') {
    const container = document.getElementById("messageExamplesSuggestions");
    if (!container.innerHTML.trim()) populateMessageExamplesSuggestions();
  }
  // Updated for new style screens (generalStyle, chatStyle, postStyle)
  if (step === 'style' && !generalStyleSuggestionsLoaded) { // 'style' is steps[9], maps to General Style
    const container = document.getElementById("generalStyleSuggestions");
    if (container && !container.innerHTML.trim()) {
        initiateGeneralStyleSuggestionsLoad();
    }
    generalStyleSuggestionsLoaded = true; // Set flag after initiating load
  }
  if (step === 'chat' && !chatStyleSuggestionsLoaded) { // 'chat' is steps[10], maps to Chat Style
    const container = document.getElementById("chatStyleSuggestions");
    if (container && !container.innerHTML.trim()) {
        initiateChatStyleSuggestionsLoad();
    }
    chatStyleSuggestionsLoaded = true; // Set flag after initiating load
  }
  if (step === 'post' && !postStyleSuggestionsLoaded) { // 'post' is steps[11], maps to Post Style
    const container = document.getElementById("postStyleSuggestions");
    if (container && !container.innerHTML.trim()) {
        initiatePostStyleSuggestionsLoad();
    }
    postStyleSuggestionsLoaded = true; // Set flag after initiating load
  }
}

function saveStep(step) {
  // Save the current step data
  switch(step) {
    case 'start':
      characterData.apiKey = document.getElementById('apiKey')?.value.trim() || characterData.apiKey;
      characterData.apiProvider = document.getElementById('apiProvider')?.value.trim() || characterData.apiProvider;
      characterData.customModel = (document.getElementById('apiProvider')?.value === 'other');

      // Save AI Model from the currently visible selection
      const openAiModelSelect = document.getElementById('aiModel');
      const groqModelSelect = document.getElementById('groqModel');
      const customModelInput = document.getElementById('customModelInput');
      const openaiModelsDiv = document.getElementById('openaiModels');
      const groqModelsDiv = document.getElementById('groqModels');
      const customModelContainerDiv = document.getElementById('customModelContainer');

      if (openaiModelsDiv && openaiModelsDiv.style.display !== 'none' && openAiModelSelect) {
        characterData.aiModel = openAiModelSelect.value.trim() || characterData.aiModel;
      } else if (groqModelsDiv && groqModelsDiv.style.display !== 'none' && groqModelSelect) {
        characterData.aiModel = groqModelSelect.value.trim() || characterData.aiModel;
      } else if (customModelContainerDiv && customModelContainerDiv.style.display !== 'none' && customModelInput) {
        characterData.aiModel = customModelInput.value.trim() || characterData.aiModel;
      } else if (openAiModelSelect) { // Default to OpenAI if nothing else is explicitly visible
        characterData.aiModel = openAiModelSelect.value.trim() || characterData.aiModel;
      }

      const apiTestStatus = document.getElementById('apiTestStatus');

      if (characterData.apiKey) {
        validateApiKey().then(result => {
          if (result.valid) {
            if (apiTestStatus) {
              apiTestStatus.textContent = result.message || 'API Key validated successfully.';
              apiTestStatus.className = 'message success-message visible';
            }
            currentStep = steps.indexOf('name');
            if (currentStep === -1) { console.error("'name' not in steps array!"); currentStep = 1; } // Fallback
            showStep();
          } else {
            if (apiTestStatus) {
              apiTestStatus.textContent = result.message || 'API Key validation failed. Please check your key and provider.';
              apiTestStatus.className = 'message error-message visible';
            }
            currentStep = steps.indexOf('start');
            if (currentStep === -1) { console.error("'start' not in steps array!"); currentStep = 0; } // Fallback
            showStep(); // Stay on start screen
          }
        }).catch(error => {
            console.error("Error during API validation:", error);
            if (apiTestStatus) {
              apiTestStatus.textContent = 'Error validating API key. See console for details.';
              apiTestStatus.className = 'message error-message visible';
            }
            currentStep = steps.indexOf('start');
            if (currentStep === -1) { currentStep = 0; } 
            showStep(); // Stay on start screen
        });
        return; // Exit saveStep, navigation handled by async promise
      } else {
        // No API key provided
        if (apiTestStatus) {
          apiTestStatus.textContent = 'API Key is required to proceed.';
          apiTestStatus.className = 'message error-message visible';
        }
        currentStep = steps.indexOf('start');
        if (currentStep === -1) { currentStep = 0; } // Fallback
        // resetUIFields(); // Decided against resetting fields, just show message and stay
        showStep(); // Re-show start screen
        return; // Exit saveStep, do not proceed to common advancement logic
      }
      // break; // This break is unreachable due to the returns in all paths
      
    case 'name':
      characterData.name = document.getElementById('characterName')?.value.trim() || '';
      break;
      
    case 'style':
    case 'chat':
    case 'post':
      // These are handled by addLine function
      break;
      
    // Add other cases as needed
  }
  
  // Initialize style arrays if they don't exist (for backward compatibility)
  if (!Array.isArray(characterData.generalStyle)) characterData.generalStyle = [];
  if (!Array.isArray(characterData.chatStyle)) characterData.chatStyle = [];
  if (!Array.isArray(characterData.postStyle)) characterData.postStyle = [];
  
  updatePreview();
  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep();
  } else {
    saveToCast();
  }
  autoSave();
}

function editCharacter(index) {
  let cast = JSON.parse(localStorage.getItem('cast')) || [];
  if (!cast[index]) return;
  
  // Save the current API settings before loading the character
  const apiSettings = {
    apiKey: characterData.apiKey || "",
    apiProvider: characterData.apiProvider || "https://api.openai.com/v1/chat/completions",
    aiModel: characterData.aiModel || "",
    customModel: characterData.customModel || false
  };
  
  editingIndex = index;
  characterData = JSON.parse(JSON.stringify(cast[index]));
  if (!characterData.style) characterData.style = { all: [], chat: [], post: [] };
  
  // Preserve API settings
  characterData.apiKey = apiSettings.apiKey;
  characterData.apiProvider = apiSettings.apiProvider;
  characterData.aiModel = apiSettings.aiModel;
  characterData.customModel = apiSettings.customModel;
  
  resetUIFields();
  populateUIFromCharacterData();
  
  // If no API key is set, start at the start screen
  // Otherwise, start at the name screen
  if(characterData.apiKey) {
    validateApiKey().then(result => {
      if (result.valid) {
        currentStep = 1;
      } else {
        currentStep = 0;
      }
      showStep();
      updatePreview();
      clearSuggestionContainers();
    });
  } else {
    currentStep = 0;
    showStep();
    updatePreview();
    clearSuggestionContainers();
  }
  
  autoSave();
}

function deleteCharacter(index) {
  let cast = JSON.parse(localStorage.getItem('cast')) || [];
  if (!cast[index]) return;
  
  const character = cast[index];
  const name = character.name || "Unnamed Character";
  
  if (confirm(`Are you sure you want to delete "${name}" from your CAST?\nThis action cannot be undone.`)) {
    const item = document.querySelectorAll('.character-item')[index];
    item.classList.add('deleting');
    setTimeout(() => {
      cast.splice(index, 1);
      localStorage.setItem('cast', JSON.stringify(cast));
      updateCastBar();
    }, 500);
  }
}


function saveToCast() {
  // Ensure characterData.name is not empty, provide a default if necessary
  if (!characterData.name || characterData.name.trim() === "") {
    characterData.name = "Unnamed Character";
  }

  // Ensure characterData.color is set, assign a random one if not
  if (!characterData.color) {
    if (typeof pickRandomColor === "function") {
      characterData.color = pickRandomColor();
    } else {
      // Fallback if pickRandomColor is somehow not defined (it should be)
      const colors = ["#FF5722","#4CAF50","#2196F3","#9C27B0","#E91E63","#009688","#FF9800","#795548"];
      characterData.color = colors[Math.floor(Math.random() * colors.length)];
    }
  }

  let cast = JSON.parse(localStorage.getItem('cast')) || [];
  // Deep copy characterData to avoid issues with shared object references in the cast
  const currentCharacterToSave = JSON.parse(JSON.stringify(characterData));

  if (editingIndex > -1 && editingIndex < cast.length) {
    // Update existing character in cast
    cast[editingIndex] = currentCharacterToSave;
    console.log("Character updated in cast at index:", editingIndex, currentCharacterToSave);
  } else {
    // Add new character to cast
    cast.push(currentCharacterToSave);
    // Update editingIndex to point to the newly added character in the cast.
    // This ensures that if the user saves again immediately, it updates the correct character.
    editingIndex = cast.length - 1; 
    console.log("New character added to cast:", currentCharacterToSave);
  }
  localStorage.setItem('cast', JSON.stringify(cast));
  updateCastBar(); // Refresh the cast bar display
  // updatePreview(); // Consider if preview needs explicit update after save. autoSave might cover it.
  // autoSave(); // Persist the current characterData (which is now also in cast) to its working slot.
}

function editCharacter(index) {
  let cast = JSON.parse(localStorage.getItem('cast')) || [];
  if (index >= 0 && index < cast.length) {
    // Deep copy from cast to characterData to prevent direct modification of cast item via characterData
    characterData = JSON.parse(JSON.stringify(cast[index]));
    editingIndex = index;
    
    populateUIFromCharacterData(); // Populate form fields with the loaded character's data
    updatePreview(); // Update the preview panel
    autoSave(); // Save this loaded character as the current working character

    // Navigate to a sensible starting point for editing, e.g., the 'name' screen
    const nameStepIndex = steps.indexOf('name');
    if (nameStepIndex !== -1) {
      currentStep = nameStepIndex; // Update currentStep global variable
      showStep(nameStepIndex);     // Show the 'name' screen
    } else {
      currentStep = 0; // Fallback to the first screen if 'name' step isn't found
      showStep(0);
    }
    console.log("Editing character from cast at index:", index);
    window.scrollTo(0, 0); // Scroll to the top of the page for better user experience
  } else {
    console.error("Attempted to edit character at invalid cast index:", index);
  }
}

function newCharacter() {
  // Reset characterData to its initial default state
  characterData = {
    clients: [], bioSeed: "", bio: [], lore: [], adjectives: [],
    knowledge: [], topics: [], messageExamples: [],
    generalStyle: [], chatStyle: [], postStyle: [],
    color: pickRandomColor(), // Assign a new random color for visual distinction
    name: "", apiKey: "", aiModel: "",
    apiProvider: "https://api.openai.com/v1/chat/completions", // Default API provider
    customModel: false
  };
  editingIndex = -1; // Indicates that this is a new character, not an edit from the cast

  resetUIFields(); // Clear all relevant UI input fields
  populateUIFromCharacterData(); // Populate UI fields with the new empty/default data
  updatePreview(); // Update the preview panel
  autoSave(); // Save this new empty character state as the current working character

  // Navigate to the first step of character creation (e.g., 'name' screen)
  const nameStepIndex = steps.indexOf('name');
  if (nameStepIndex !== -1) {
    currentStep = nameStepIndex;
    showStep(nameStepIndex);
  } else {
    currentStep = 0; // Fallback to the first screen
    showStep(0);
  }
  console.log("New character initialized and UI reset.");
  window.scrollTo(0, 0); // Scroll to the top of the page
}

async function saveStep(stepName) {
  try {
    autoSave(); // This calls updatePreview internally
  } catch (e) {
    console.error(`%c saveStep: ERROR during autoSave() for step '${stepName}':`, 'color: red; font-weight: bold;', e);
    // Consider if we should stop here or try to continue depending on error severity
  }

  // --- Step-specific data saving --- (Add other steps as needed)
  if (stepName === 'name') {
    characterData.name = document.getElementById('characterName')?.value.trim() || "";
  } else if (stepName === 'clients') {
    // Assuming clients are saved via toggleClient which calls autoSave.
    // If direct save needed: characterData.clients = ...
  }
  // Add other specific data saving logic here, e.g.:
  // else if (stepName === 'bio') { characterData.bioSeed = ... ; }

  // --- Navigation Logic --- 
  if (stepName === 'start') {
    // Capture API details from the start screen
    characterData.apiKey = document.getElementById('apiKey')?.value.trim() || "";
    const apiProviderSelect = document.getElementById('apiProvider');
    if (apiProviderSelect) {
      if (apiProviderSelect.value === 'other') {
        characterData.apiProvider = document.getElementById('apiProviderInput')?.value.trim() || "";
      } else {
        characterData.apiProvider = apiProviderSelect.value;
      }
    }
    const customModelCheckbox = document.getElementById('customModel'); // Corrected ID from memory
    if (customModelCheckbox && customModelCheckbox.checked) {
        characterData.aiModel = document.getElementById('customModelInput')?.value.trim() || "";
        characterData.customModel = true;
    } else {
        characterData.customModel = false;
        if (characterData.apiProvider === 'https://api.openai.com/v1/chat/completions') {
            characterData.aiModel = document.getElementById('aiModel')?.value || "";
        } else if (characterData.apiProvider === 'https://api.groq.com/openai/v1/chat/completions') {
            characterData.aiModel = document.getElementById('groqModel')?.value || "";
        }
    }

    const nextButton = document.getElementById('nextButtonStartScreen');
    const statusDisplay = document.getElementById('apiTestStatus');

    if (nextButton) nextButton.disabled = true;
    if (nextButton) nextButton.textContent = 'Testing API...';
    if (statusDisplay) statusDisplay.textContent = 'Testing API connection...';
    if (statusDisplay) statusDisplay.className = 'message info-message';

    const validationResult = await validateApiKey(characterData.apiKey, characterData.apiProvider, characterData.aiModel);

    if (validationResult.valid) {
      if (statusDisplay) statusDisplay.textContent = 'API Key Valid!';
      if (statusDisplay) statusDisplay.className = 'message success-message';
      const currentStepIndex = steps.indexOf(stepName);
      if (currentStepIndex !== -1 && currentStepIndex < steps.length - 1) {
        currentStep = currentStepIndex + 1;
        showStep();
      } else {
        console.warn("Attempted to advance from the last step or invalid step from 'start':", stepName);
      }
      setTimeout(() => {
        if (statusDisplay && statusDisplay.textContent === 'API Key Valid!') statusDisplay.textContent = '';
      }, 3000);
    } else {
      if (statusDisplay) statusDisplay.textContent = validationResult.message || 'API Key validation failed. Please check your details.';
      if (statusDisplay) statusDisplay.className = 'message error-message';
    }
    if (nextButton) nextButton.disabled = false;
    if (nextButton) nextButton.textContent = 'Next →';
    // 'start' step handles its own completion and navigation. Final updatePreview is called before return.

  } else if (stepName === 'settings') {
    console.log(`%c saveStep: Entered 'settings' block for stepName: '${stepName}'`, 'color: blue;');
    // Logic for the "Finish" button on the settings screen
    // Assuming API key and model might be re-confirmed/saved from settings if they were editable there.
    // For now, primarily saving to cast.
    saveToCast();
    console.log("Character saved to cast via Finish button on settings screen.");
    alert("Character settings saved and character added/updated in CAST!");
    // 'settings' is a terminal action for navigation. Final updatePreview is called before return.

  } else {
    // General navigation logic for all other steps (e.g., 'name', 'clients', 'bio', etc.)
    const currentStepIndex = steps.indexOf(stepName);
    console.log(`%c saveStep (General Nav for '${stepName}'): currentStepIndex: ${currentStepIndex} ('${steps[currentStepIndex]}'). Global currentStep before update: ${currentStep} ('${steps[currentStep]}')`, 'color: green;');
    if (currentStepIndex !== -1 && currentStepIndex < steps.length - 1) {
      currentStep = currentStepIndex + 1;
      console.log(`%c saveStep (General Nav for '${stepName}'): Global currentStep AFTER update: ${currentStep} ('${steps[currentStep]}'). Attempting to show step.`, 'color: green; font-weight: bold;');
      showStep();
      console.log(`%c saveStep (General Nav for '${stepName}'): showStep() presumably called for ${steps[currentStep]}`, 'color: green;');
    } else if (currentStepIndex === steps.length - 1) {
      console.warn("Attempted to advance from what appears to be the last step via general navigation. Step:", stepName, "This should typically be handled by 'settings' case.");
    } else {
      console.error("Invalid stepName passed to saveStep or step not found in steps array for general navigation:", stepName);
    }
  }

  // Final actions for all paths (unless returned early, like potentially 'start' or 'settings' could if they fully managed their own preview)
  try {
    updatePreview(); 
    console.log(`%c saveStep: Final updatePreview() called for step: '${stepName}' and completed.`, 'color: blue;');
  } catch (e) {
    console.error(`%c saveStep: ERROR during final updatePreview() for step '${stepName}':`, 'color: red; font-weight: bold;', e);
  }
  console.log(`%c saveStep: Finished for step: '${stepName}'. Global currentStep is now: ${currentStep} ('${steps[currentStep]}')`, 'color: blue; font-weight: bold;');
  // For 'start' and 'settings', if they need to return to stop this final log, they should do so before this point.
  // However, the current structure has them fall through to this final logging and preview update.
  // Added explicit returns to 'start' and 'settings' if they fully manage their own completion.
  if (stepName === 'start' || stepName === 'settings') {
      return; // Ensure 'start' and 'settings' don't re-log or have unintended side-effects from common path end.
  }
}

function updateCastBar() {
  let cast = JSON.parse(localStorage.getItem('cast')) || [];
  const castList = document.getElementById('castList');
  const placeholders = document.getElementById('castPlaceholders');
  castList.innerHTML = "";
  if (cast.length === 0) {
    placeholders.innerText = "No characters saved.";
  } else {
    placeholders.innerText = "";
    cast.forEach((char, index) => {
      const item = document.createElement("div");
      item.className = "character-item";
      
      const leftDiv = document.createElement("div");
      leftDiv.className = "character-left";
      
      const circle = document.createElement("span");
      circle.className = "color-circle";
      circle.style.backgroundColor = char.color || pickRandomColor();
      leftDiv.appendChild(circle);
      
      const nameLink = document.createElement("a");
      nameLink.className = "character-name";
      nameLink.innerText = char.name || "Unnamed Character";
      nameLink.href = "#";
      nameLink.onclick = (e) => {
        e.preventDefault();
        editCharacter(index);
      };
      leftDiv.appendChild(nameLink);
      
      const rightDiv = document.createElement("div");
      rightDiv.className = "character-actions";
      
      const editBtn = document.createElement("button");
      editBtn.className = "btn-icon-only"; // Updated class
      editBtn.innerHTML = '<i class="fas fa-edit"></i>'; // Icon
      editBtn.setAttribute('aria-label', 'Edit Character'); // Accessibility
      editBtn.onclick = () => editCharacter(index);
      
      const delBtn = document.createElement("button");
      delBtn.className = "btn-icon-only"; // Updated class
      delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; // Icon
      delBtn.setAttribute('aria-label', 'Delete Character'); // Accessibility
      delBtn.onclick = () => deleteCharacter(index);
      
      const downloadBtn = document.createElement("button");
      downloadBtn.className = "btn-icon-only"; // Updated class
      downloadBtn.innerHTML = '<i class="fas fa-download"></i>'; // Icon
      downloadBtn.setAttribute('aria-label', 'Download Character'); // Accessibility
      downloadBtn.onclick = () => downloadCharacter(index);
      
      rightDiv.appendChild(editBtn);
      rightDiv.appendChild(delBtn);
      rightDiv.appendChild(downloadBtn);
      
      item.appendChild(leftDiv);
      item.appendChild(rightDiv);
      castList.appendChild(item);
    });
  }
}

function toggleCastBar() {
  const castBar = document.getElementById('castBar');
  const toggleBtn = castBar.querySelector('.toggle-btn');
  const toggleIcon = document.getElementById('castToggleIcon'); // Get the icon element

  if (castBar.classList.contains('expanded')) {
    castBar.classList.remove('expanded');
    // Keep the text part of the button, only change the icon and the first word
    toggleBtn.firstChild.textContent = 'Show '; // Update text node
    if (toggleIcon) {
      toggleIcon.classList.remove('fa-chevron-down');
      toggleIcon.classList.add('fa-chevron-up');
    }
  } else {
    castBar.classList.add('expanded');
    toggleBtn.firstChild.textContent = 'Hide '; // Update text node
    if (toggleIcon) {
      toggleIcon.classList.remove('fa-chevron-up');
      toggleIcon.classList.add('fa-chevron-down');
    }
  }
}

function downloadCharacter(index) {
  let cast = JSON.parse(localStorage.getItem('cast')) || [];
  const character = cast[index];
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(character, null, 2));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", character.name ? character.name + ".json" : "character.json");
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function pickRandomColor() {
  return availableColors[Math.floor(Math.random() * availableColors.length)];
}

/* --- UI POPULATION --- */
function populateUIFromCharacterData() {
  // Populate the UI fields from characterData
  document.getElementById('apiKey').value = characterData.apiKey || '';
  
  // Populate API provider
  if (characterData.apiProvider) {
    const apiProviderSelect = document.getElementById('apiProvider');
    const predefinedOptions = Array.from(apiProviderSelect.options).map(opt => opt.value);
    
    if (predefinedOptions.includes(characterData.apiProvider)) {
      apiProviderSelect.value = characterData.apiProvider;
    } else {
      apiProviderSelect.value = 'other';
      document.getElementById('apiProviderInput').value = characterData.apiProvider;
      document.getElementById('apiProviderOther').style.display = 'block';
    }
    
    // Update model options based on provider
    updateModelOptions();
    
    // Set the model value based on provider
    if (characterData.apiProvider === 'https://api.openai.com/v1/chat/completions') {
      const aiModelSelect = document.getElementById('aiModel');
      const options = Array.from(aiModelSelect.options).map(opt => opt.value);
      if (options.includes(characterData.aiModel)) {
        aiModelSelect.value = characterData.aiModel;
      } else if (characterData.aiModel) {
        // If the model isn't in the dropdown, add it
        const option = document.createElement('option');
        option.value = characterData.aiModel;
        option.textContent = characterData.aiModel;
        aiModelSelect.appendChild(option);
        aiModelSelect.value = characterData.aiModel;
      } else {
        aiModelSelect.value = 'gpt-4-turbo-2024-04-09';
      }
    } else if (characterData.apiProvider === 'https://api.groq.com/openai/v1/chat/completions') {
      const groqModelSelect = document.getElementById('groqModel');
      const options = Array.from(groqModelSelect.options).map(opt => opt.value);
      if (options.includes(characterData.aiModel)) {
        groqModelSelect.value = characterData.aiModel;
      } else if (characterData.aiModel) {
        // If the model isn't in the dropdown, add it
        const option = document.createElement('option');
        option.value = characterData.aiModel;
        option.textContent = characterData.aiModel;
        groqModelSelect.appendChild(option);
        groqModelSelect.value = characterData.aiModel;
      } else {
        groqModelSelect.value = 'llama-3.1-70b-versatile';
      }
    } else if (characterData.customModel) {
      document.getElementById('customModelInput').value = characterData.aiModel || '';
    }
  }
  
  document.getElementById('characterName').value = characterData.name || '';
  document.querySelectorAll('#screen-clients input[type="checkbox"]').forEach(chk => {
    chk.checked = (characterData.clients || []).includes(chk.value);
  });
  if (characterData.bioSeed) {
    document.getElementById('bioSeed').value = characterData.bioSeed;
  }
  ['bio','lore','knowledge','topics','adjectives'].forEach(field => {
    updateLineList(field);
  });
  updateMessageExamplesUI();

  // Populate new style textareas
  const generalStyleTextarea = document.getElementById('generalStyleTextarea');
  if (generalStyleTextarea) {
    generalStyleTextarea.value = (characterData.generalStyle || []).join('\n');
  }
  const chatStyleTextarea = document.getElementById('chatStyleTextarea');
  if (chatStyleTextarea) {
    chatStyleTextarea.value = (characterData.chatStyle || []).join('\n');
  }
  const postStyleTextarea = document.getElementById('postStyleTextarea');
  if (postStyleTextarea) {
    postStyleTextarea.value = (characterData.postStyle || []).join('\n');
  }
}

function resetUIFields() {
  document.getElementById('characterName').value = "";
  document.querySelectorAll('#screen-clients input[type="checkbox"]').forEach(chk => chk.checked = false);
  document.getElementById('bioSeed').value = "";
  ['bio','lore','knowledge','topics','adjectives'].forEach(field => {
    const c = document.getElementById(field + 'Lines');
    if (c) c.innerHTML = "";
  });
  document.getElementById('messageExamplesContainer').innerHTML = "";
  
  // Clear new textareas
  const generalStyleTextarea = document.getElementById('generalStyleTextarea');
  if (generalStyleTextarea) generalStyleTextarea.value = "";
  const chatStyleTextarea = document.getElementById('chatStyleTextarea');
  if (chatStyleTextarea) chatStyleTextarea.value = "";
  const postStyleTextarea = document.getElementById('postStyleTextarea');
  if (postStyleTextarea) postStyleTextarea.value = "";

  clearSuggestionContainers();
}

function clearSuggestionContainers() {
  const ids = ['nameSuggestions','bioSuggestions','loreSuggestions','knowledgeSuggestions','topicsSuggestions','adjectivesSuggestions','messageExamplesSuggestions','styleallSuggestions','stylechatSuggestions','stylepostSuggestions'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
}
