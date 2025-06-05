// gpt.js
// All GPT prompting and suggestion functions

// Function to call the OpenAI API and return an array of suggestion lines
async function getChatSuggestions(prompt) {
    if (!characterData.apiKey) {
      throw new Error("No API key provided. Go back to 'Start' step and enter a valid key.");
    }
    if (!characterData.aiModel) {
      throw new Error("No AI model selected.");
    }

    const targetApiUrl = characterData.apiProvider || "https://api.openai.com/v1/chat/completions";
    const proxyUrl = "proxy.php";

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ];

    const originalPayload = {
      model: characterData.aiModel,
      messages: messages,
      max_tokens: 500,
      temperature: 0.9,
      n: 1
    };

    const proxyRequestBody = {
      targetApiUrl: targetApiUrl,
      payload: originalPayload
    };

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + characterData.apiKey
      },
      body: JSON.stringify(proxyRequestBody)
    });

    if (!response.ok) {
      const errText = await response.text(); // Get raw text for better error diagnosis from proxy
      console.error("Proxy/API error text:", errText);
      try {
        const errJson = JSON.parse(errText);
        throw new Error(errJson.error?.message || errJson.error || "Failed to fetch suggestions via proxy.");
      } catch (e) {
        throw new Error(`Failed to fetch suggestions. Status: ${response.status}. Response: ${errText}`);
      }
    }

    const data = await response.json();
    if (data.error) { // Handle errors returned by the proxy itself or the target API via proxy
        console.error("Error from proxy/API:", data.error);
        throw new Error(data.error.message || data.error);
    }
    const content = data.choices[0].message.content.trim();
    const lines = content.split("\n").map(l => l.trim().replace(/^-\s*/, "")).filter(Boolean);
    return lines;
  }
  
  // Function to validate API key by making a test request
async function validateApiKey(apiKey, apiProvider, model) {
  if (!apiKey) {
    console.warn("API Key is empty for validation.");
    return { valid: false, error: "API Key is empty." };
  }
  if (!model) {
    console.warn("No model selected for validation.");
    return { valid: false, error: "No AI model selected for validation." };
  }

  const targetApiUrl = apiProvider || "https://api.openai.com/v1/chat/completions";
  const proxyUrl = "proxy.php";

  const originalPayload = {
    model: model, // Use the 'model' parameter
    messages: [{ role: "user", content: "Test" }],
    max_tokens: 5
  };

  const proxyRequestBody = {
    targetApiUrl: targetApiUrl,
    payload: originalPayload
  };

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey, // Use the 'apiKey' parameter
      },
      body: JSON.stringify(proxyRequestBody),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.error) { // Check for errors returned by proxy/API even on 200 OK
        console.error("API Key validation failed (proxy/API error):", data.error.message || data.error);
        return { valid: false, error: data.error.message || data.error };
      }
      return { valid: true };
    } else {
      const errorText = await response.text();
      console.error("API Key validation failed (HTTP error text):", errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return { valid: false, error: errorJson.error?.message || errorJson.error || `Validation failed with status: ${response.status}` };
      } catch (e) {
        return { valid: false, error: `Validation failed. Status: ${response.status}. Response: ${errorText}` };
      }
    }
  } catch (error) {
    console.error("Network error during API Key validation via proxy:", error.message);
    return { valid: false, error: "Network error or API unreachable during validation via proxy." };
  }
}
  
  // Suggestion functions for various screens
  
  async function populateNameSuggestions() {
    const container = document.getElementById("nameSuggestions");
    container.innerHTML = `<span class="loading-suggestions"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</span>`;
    try {
      const prompt = `
Generate a list of 10 unique character names. Follow these rules with extreme precision and pay close attention to all constraints:

Part 1: Single-Word Names (Generate 5)
These MUST be only one word. These are primarily candidates for the 'Normal-Sounding Names' category if they are common human first names.
Examples of common single-word human first names: "John", "Mary", "Peter", "Lisa", "David" (Avoid any thematic or abstract words here)

Part 2: Two-Word or Three-Word Names (Generate 5)
These MUST be two or three words.
Examples: "Arthur Dent", "Louisa McKay", "Marcus Webb", "Jose Calderon", "Captain Miller", "Fishy McFishFace Jones", "Sarah Jessica Parker", "John Michael Smith"

Overall Name Styles (Strictly 10 names in total, distributed as follows):

A. EXACTLY 5 names MUST be "Normal-Sounding Names".
   - Definition: These names MUST be extremely common, ordinary, mundane, and BORING human names (common first names, common last names, or common full names, like the updated examples in Part 1 or common surnames). They should evoke absolutely no specific theme (fantasy, sci-fi, celestial, abstract, common objects, or evocative nature words like 'River', 'Stone' unless they are actual common human names).
   - Examples of "Normal-Sounding Names" (beyond Part 1 examples if needed for multi-word): "Smith", "Garcia", "David Lee", "Sarah Brown", "William Davis", "Linda Wilson"
   - CRITICAL: These 5 normal-sounding names MUST NOT be sourced from or resemble any examples provided for the 'AI-ish/Futuristic' or 'Weird/Funny' categories.
   - CRITICAL: These 5 normal-sounding names MUST NOT contain any themes or words from the "STRICTLY FORBIDDEN" list below. If they do, the entire output is considered a failure and is unusable.

B. EXACTLY 2 names MUST be "AI-ish or Futuristic Names".
   - Definition: Names that sound technological, robotic, from the future, or like AI constructs.
   - Examples: "Unit 734", "Nova Circuit", "Jaxler", "Cyra-7", "GlitchCore"

C. EXACTLY 3 names MUST be "Weird or Funny Names".
   - Definition: Names that are unusual, comical, absurd, or intentionally strange. This is where words like "River", "Stone", "Path", "Brick", "Bolt" could fit if used creatively and not as 'normal' names.
   - Examples: "Professor Pants", "Wobblebottom", "Sir Reginald Fluffybutt III", "The Unspeakable Entity Formerly Known as Bob", "Captain Quackenbush"

STRICTLY FORBIDDEN THEMES/WORDS for the 5 "Normal-Sounding Names":
1.  Technology/Computers/Robotics/Cybernetics (these belong ONLY to category B).
2.  Fantasy/Mythology/Magic (e.g., dragon, elf, fae, wizard, unicorn, griffin, phoenix, spell, myth, legend).
3.  Celestial/Space/Cosmic: DO NOT USE words like: star, sun, moon, sky, nova, celestial, cosmic, galaxy, nebula, planet, comet, astral, luna, solar, stellar, meteor, orbit, constellation, zodiac, eclipse, twilight, dawn, aurora, zenith, cosmos, universe, void, ethereal, or any synonyms/related terms.
4.  Abstract Concepts as Names: Avoid words like Echo, Hope, Faith, Destiny, Serenity, Justice, Liberty, Bliss, Chaos, Karma, Muse, Spirit, Whisper, Riddle, Quest, Charm, Virtue, Vice, Fate.
5.  Evocative Nature elements for "Normal-Sounding Names": For the 5 'Normal-Sounding Names', do NOT use nature words like River, Stone, Bolt, Zephyr, Storm, Willow etc., even if they are common words. These types of words, if used, should be for the 'Weird/Funny' or possibly 'AI-ish' categories if they fit the theme. Normal names must be common human names.

Output Format:
- One name per line.
- First 5 names = single-word. Next 5 names = two/three-word.
- No numbering, no quotes, no punctuation.
- Adhere to the style counts (5 Normal, 2 AI, 3 Weird/Funny) with absolute precision.
    `;
      const suggestions = await getChatSuggestions(prompt);
      container.innerHTML = "";
      suggestions.forEach(sugg => {
        const btn = document.createElement("button");
        btn.className = "btn-sugg";
        btn.style.textAlign = "left";
        btn.innerText = sugg;
        btn.onclick = () => {
          btn.classList.add("fade-out");
          setTimeout(() => btn.remove(), 500);
          document.getElementById("characterName").value = sugg;
          characterData.name = sugg;
          updatePreview();
          autoSave();
        };
        container.appendChild(btn);
      });
    } catch (err) {
      container.innerHTML = `<p style="color:red; margin:10px 0;">Error: ${err.message}</p>`;
    }
  }
  
  async function populateBioSuggestions() {
    const container = document.getElementById("bioSuggestions");
    container.innerHTML = `<span class="loading-suggestions"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</span>`;
    try {
      const seed = document.getElementById("bioSeed").value.trim();
      const characterName = characterData.name || "the character"; // Use a fallback if name is not set
      let prompt;

      if (!seed) {
        prompt = `
  Generate 10 short character bio sentences for a character named ${characterName}.
  Each should be a single short sentence about ${characterName}.
  Output one sentence per line, with no numbering or quotes.
        `;
      } else {
        const existing = characterData.bio.join(" | ") || "No existing lines yet.";
        prompt = `
  The character's name is ${characterName}.
  Their Bio Seed (in third person, referring to ${characterName}) is:
  "${seed}"

  Their existing BIO Lines (in third person, referring to ${characterName}) are:
  "${existing}"

  The Bio Seed may contain multiple key components (e.g., a profession, a location, a hobby/quirk). Your task is to generate 10 new third-person bio lines for ${characterName}, ensuring a variety of focuses:

  1.  Focus on Individual Components (Approx. 6 lines total):
      -   Identify up to 3 main components in the CURRENT Bio Seed (i.e., the value of "${seed}" provided at the start of this prompt).
          (Example: If a seed is 'X and Y', components could be 'X', 'Y'.)
          (Crucial: Example terms like 'X' or 'Y' are for illustration only. Use only terms from the CURRENT Bio Seed.)
      -   Dedicate about 2 lines to exploring EACH of these primary components derived *only* from the CURRENT Bio Seed *somewhat independently*.
          -   (Example: If current seed was 'A from B who likes C', explore A, then B, then C. Use terms from CURRENT Bio Seed only.)
      -   These lines must offer specific details or insights related to that single component taken *only* from the CURRENT Bio Seed.

  2.  Creative Combinations & Wild Twists (Approx. 4 lines total):
      -   These lines should creatively combine TWO OR MORE components derived *only* from the CURRENT Bio Seed in interesting, unexpected, or humorous ways.
      -   Explore unusual facets, surprising skills, or absurd scenarios that arise from the JUXTAPOSITION of these elements from the CURRENT Bio Seed.
      -   (FOR EXAMPLE ONLY: if the current Bio Seed was "a gangster from Bristol UK, with a penchant for Pig farming", you might explore how being a "gangster" AND a "pig farmer" in "Bristol" leads to unique situations. IMPORTANT: DO NOT use these specific example words/themes UNLESS they are part of the actual CURRENT Bio Seed you are processing.)
      -   AVOID generic fantasy tropes (like "magic potions" or "hidden realms") UNLESS the CURRENT Bio Seed itself strongly implies them. Instead, find the extraordinary in the ordinary elements provided in the CURRENT Bio Seed.

  All 10 lines should be distinct, about ${characterName}, and offer new information or perspectives.
  Provide each line on its own line, with no numbering or quotes.
        `;
      }
      const suggestions = await getChatSuggestions(prompt);
      container.innerHTML = "";
      suggestions.forEach(sugg => {
        const btn = document.createElement("button");
        btn.className = "btn-sugg";
        btn.innerText = sugg;
        btn.onclick = () => {
          btn.classList.add("fade-out");
          setTimeout(() => btn.remove(), 500);
          characterData.bio.push(sugg);
          updateLineList("bio");
          updatePreview();
          autoSave();
        };
        container.appendChild(btn);
      });
    } catch (err) {
      container.innerHTML = `<p style="color:red; margin:10px 0;">Error: ${err.message}</p>`;
    }
  }
  
  async function populateLoreSuggestions() {
    const container = document.getElementById("loreSuggestions");
    container.innerHTML = `<span class="loading-suggestions"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</span>`;
    try {
      const characterName = characterData.name || "the character";
      const existingBio = characterData.bio.join(" | ") || "No existing bio lines.";
      const existingLore = characterData.lore.join(" | ") || "No existing lore lines.";
      const prompt = `
The character's name is ${characterName}.
Their current Bio, which describes some core aspects, is:
${existingBio}

Their existing Lore is:
${existingLore}

Generate 10 new third-person lore lines for ${characterName}. These lines should be matter-of-fact and grounded in realistic, everyday experiences, focusing on plausible character background and development. Avoid fantastical or mythical elements unless strongly implied by the existing Bio.

The goal is to build a believable history for ${characterName}.
- Some lines can draw inspiration from the Bio, but aim to reveal new facets or possibilities within a realistic framework for ${characterName}.
- Lines should detail formative experiences, significant personal relationships, key life decisions, skills acquired, or notable past events that shaped ${characterName}.
- At least 4-5 of these suggestions should explore distinctly different, yet plausible, aspects of ${characterName}'s life or background to ensure variety.
- Suggestions can vary in length: some can be short, impactful phrases (e.g., "Excelled in mathematics from a young age"), while others can be more detailed explanations or brief anecdotes (e.g., "Spent three years volunteering at a local animal shelter, which solidified a lifelong passion for animal welfare.").
Do not include numbering or quotes, produce each line on its own line.
    `;
      const suggestions = await getChatSuggestions(prompt);
      container.innerHTML = "";
      suggestions.forEach(sugg => {
        const btn = document.createElement("button");
        btn.className = "btn-sugg";
        btn.innerText = sugg;
        btn.onclick = () => {
          btn.classList.add("fade-out");
          setTimeout(() => btn.remove(), 500);
          characterData.lore.push(sugg);
          updateLineList("lore");
          updatePreview();
          autoSave();
        };
        container.appendChild(btn);
      });
    } catch (err) {
      container.innerHTML = `<p style="color:red; margin:10px 0;">Error: ${err.message}</p>`;
    }
  }
  
  async function populateAdjectivesSuggestions() {
    const container = document.getElementById("adjectivesSuggestions");
    container.innerHTML = `<span class="loading-suggestions"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</span>`;
    try {
      const existingName = characterData.name || "No name";
      const existingBio = characterData.bio.join(" | ") || "No bio lines.";
      const existingLore = characterData.lore.join(" | ") || "No lore lines.";
      const existingKnowledge = characterData.knowledge.join(" | ") || "No knowledge lines.";
      const existingTopics = characterData.topics.join(" | ") || "No topics.";
      const prompt = `
The character's name is ${existingName}.
Bio: ${existingBio}
Lore: ${existingLore}
Knowledge: ${existingKnowledge}
Topics: ${existingTopics}

Generate 10 short adjectives or descriptive phrases in third person:
- The first 5 should fit the existing data.
- The next 5 should be random or creative.
Synthesize each suggestion down to its shortest form (1-3 words).
Among them, 6 should be one-word adjectives (~60%).
IMPORTANT: Each suggestion must be a single line and contain NO numbering, NO quotes, NO commas, NO full-stops (periods), and absolutely NO other punctuation marks of any kind.
    `;
      const suggestions = await getChatSuggestions(prompt);
      container.innerHTML = "";
      suggestions.forEach(sugg => {
        const btn = document.createElement("button");
        btn.className = "btn-sugg";
        btn.innerText = sugg;
        btn.onclick = () => {
          btn.classList.add("fade-out");
          setTimeout(() => btn.remove(), 500);
          characterData.adjectives.push(sugg);
          updateLineList("adjectives");
          updatePreview();
          autoSave();
        };
        container.appendChild(btn);
      });
    } catch (err) {
      container.innerHTML = `<p style="color:red; margin:10px 0;">Error: ${err.message}</p>`;
    }
  }

async function populateKnowledgeSuggestions() {
  const container = document.getElementById("knowledgeSuggestions");
  container.innerHTML = `<span class="loading-suggestions"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</span>`;
  try {
    const characterName = characterData.name || "the character"; // Added character name
    const existingBio = characterData.bio.join(" | ") || "No existing bio lines.";
    const existingLore = characterData.lore.join(" | ") || "No existing lore lines.";
    const existingK = characterData.knowledge.join(" | ") || "No existing knowledge lines.";
    const prompt = `
The character's name is ${characterName}.
Their Bio is: ${existingBio}
Their Lore is: ${existingLore}
Their current knowledge lines are: ${existingK}

Generate 10 new third-person knowledge lines for ${characterName}:
- The first 4 should be specific facts or pieces of information relevant to ${characterName}'s Bio and Lore.
- The next 6 should be broader, potentially surprising, pieces of knowledge from diverse real-world or fictional domains that ${characterName} might possess.
Synthesize each suggestion down to its shortest, most impactful form.
No numbering or quotes, one line each.
    `;
    const suggestions = await getChatSuggestions(prompt);
    container.innerHTML = "";
    suggestions.forEach(sugg => {
      const btn = document.createElement("button");
      btn.className = "btn-sugg";
      btn.innerText = sugg;
      btn.onclick = () => {
        btn.classList.add("fade-out");
        setTimeout(() => btn.remove(), 500);
        characterData.knowledge.push(sugg);
        updateLineList("knowledge");
        updatePreview();
        autoSave();
      };
      container.appendChild(btn);
    });
  } catch (err) {
    container.innerHTML = `<p style="color:red; margin:10px 0;">Error: ${err.message}</p>`;
  }
}

async function populateTopicsSuggestions() {
  const container = document.getElementById("topicsSuggestions");
  container.innerHTML = `<span class="loading-suggestions"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</span>`;
  try {
    const characterName = characterData.name || "the character";
    const existingT = characterData.topics.join(" | ") || "No existing topics.";
    const existingBio = characterData.bio.join(" | ") || "No bio lines.";
    const existingLore = characterData.lore.join(" | ") || "No lore lines.";
    const prompt = `
The character's name is ${characterName}.
Their Bio is: ${existingBio}
Their Lore is: ${existingLore}
Their current Topics of interest are: ${existingT}

Generate 10 concise phrases representing broad domains of knowledge, expertise, or significant interest for ${characterName}.
These should be suitable as categories or high-level topic areas. For example, instead of "the first artificial satellite was launched in soviet union in 1957", suggest "Space Technology" or "Soviet History".

- The first 6 suggestions should be 1-3 word phrases directly related to ${characterName}'s Bio and Lore.
- The next 4 suggestions should be 1-3 word phrases representing diverse or creative domains that could complement ${characterName}'s profile.
- All suggestions should be distinct and avoid overly specific facts.
- Output each domain on a new line. No numbering, quotes, full-stops, commas, or other punctuation.
    `;
    const suggestions = await getChatSuggestions(prompt);
    container.innerHTML = "";
    suggestions.forEach(sugg => {
      const btn = document.createElement("button");
      btn.className = "btn-sugg";
      btn.innerText = sugg;
      btn.onclick = () => {
        btn.classList.add("fade-out");
        setTimeout(() => btn.remove(), 500);
        characterData.topics.push(sugg);
        updateLineList("topics");
        updatePreview();
        autoSave();
      };
      container.appendChild(btn);
    });
  } catch (err) {
    container.innerHTML = `<p style="color:red; margin:10px 0;">Error: ${err.message}</p>`;
  }
}
  
  async function populateMessageExamplesSuggestions() {
  const container = document.getElementById("messageExamplesSuggestions");
  container.innerHTML = `<span class="loading-suggestions"><i class="fas fa-spinner fa-spin"></i> Loading suggestions...</span>`;
  try {
    const existingName = characterData.name || "No name";
    const existingBio = characterData.bio.join(" | ") || "No bio lines.";
    const existingLore = characterData.lore.join(" | ") || "No lore lines.";
    const existingKnowledge = characterData.knowledge.join(" | ") || "No knowledge lines.";
    const existingTopics = characterData.topics.join(" | ") || "No topics.";

    const prompt = `
The character's name is ${existingName}.
Their Bio is: ${existingBio}
Their Lore is: ${existingLore}
// Knowledge and Topics are less relevant for pure style, so they are de-emphasized in the instructions.

The primary goal is to generate examples of ${existingName}'s unique *verbal identity* and *speaking patterns*, not just responses related to their life story.
Focus on *how* they say things.

Generate 6 distinct example interactions.
- EXACTLY 2 of these interactions MUST feature a SHORT character response (1-5 words).
- EXACTLY 2 of these interactions MUST feature a MEDIUM character response (1-2 concise sentences).
- EXACTLY 2 of these interactions MUST feature a LONG character response (2-5 concise sentences).

Each of the 6 interactions must highlight a *different* stylistic element of ${existingName}'s speech, plausibly inferred from their Bio and Lore. Consider elements like:
- Catch-phrases (often good for short responses)
- Grammatical quirks
- Preferred vocabulary
- Rhythm and Pacing
- Verbal Tics or Idiosyncrasies
- Overall Tone

Furthermore, the 6 examples should collectively demonstrate a variety of conversational styles. Aim to include a mix, such as (but not limited to, and should be appropriate for the character):
- Inquisitive (e.g., asking a question back)
- Friendly / Warm
- Mysterious / Evasive
- Humorous / Witty
- Formal / Precise
- Assertive / Confident
- Sarcastic
- Detached / Clinical

The character's response in each interaction should be a clear demonstration of the chosen stylistic element AND a hint of a conversational style.
The "User says" part should be extremely generic and neutral (e.g., "User says: Tell me something.", "User says: Go on.", "User says: And then?"). This is to ensure the character's response is where the stylistic distinctiveness shines.

Output Format:
Provide each interaction clearly, for example:
User says: Go on.
${existingName} says: [Character's short or medium response demonstrating style]

Separate each full interaction (User says + Character responds) with a blank line.
IMPORTANT: Output ONLY the "User says:" and "Character responds:" lines for each of the 6 interactions. Do NOT include any additional notes, comments, or explanations about the style being demonstrated. Strictly adhere to the specified format.
`;

    const rawSuggestions = await getChatSuggestions(prompt);
    const text = rawSuggestions.join("\n"); // Assuming getChatSuggestions returns an array of lines
    const allPairs = parseAllMessagePairs(text, existingName); // Ensure this function exists and works as expected

    container.innerHTML = ""; // Clear loading message

    if (allPairs && allPairs.length > 0) {
      allPairs.forEach(pair => {
        const btn = document.createElement("button");
        btn.className = "btn-sugg";
        // Ensure pair.user and pair.character are defined
        btn.innerText = `User says: ${pair.user || '...'}\nCharacter responds: ${pair.character || '...'}`;
        btn.onclick = () => {
          btn.classList.add("fade-out");
          setTimeout(() => btn.remove(), 500);
          // Ensure characterData.messageExamples exists
          if (!characterData.messageExamples) {
            characterData.messageExamples = [];
          }
          // Add as a pair of objects
          characterData.messageExamples.push({ role: 'user', content: pair.user || '' });
          characterData.messageExamples.push({ role: 'assistant', content: pair.character || '' });
          
          updateMessageExamplesUI(); // This function will be re-added to script.js
          // updatePreview(); // autoSave() calls updatePreview()
          autoSave();
        };
        container.appendChild(btn);
      });
    } else {
      container.innerHTML = "<p style='margin:10px 0;'>No message examples generated or failed to parse.</p>";
    }
  } catch (err) {
    container.innerHTML = `<p style="color:red; margin:10px 0;">Error: ${err.message}</p>`;
    console.error("Error in populateMessageExamplesSuggestions:", err); // Added for better debugging
  }
}

// --- GENERAL STYLE SUGGESTIONS --- //
async function getAndDisplayGeneralStyleSuggestions() {
  const containerId = 'generalStyleSuggestions';
  const container = document.getElementById(containerId);
  
  // Ensure characterData is available
  const characterData = window.characterData || {
    name: "",
    bio: [],
    lore: [],
    adjectives: [],
    generalStyle: []
  };

  try {
    const charName = characterData.name || "the character";
    const bioText = characterData.bio?.join(' ') || "no bio provided";
    const loreText = characterData.lore?.join(' ') || "no lore provided";
    const adjectivesText = characterData.adjectives?.join(', ') || "no adjectives provided";
    const existingStyle = characterData.generalStyle?.join(' | ') || "no style defined yet";

    const prompt = `
Character Name: ${charName}
Character Bio: ${bioText}
Character Lore: ${loreText}
Character Adjectives: ${adjectivesText}
Existing Style: ${existingStyle}

Based on the character details above, generate 5-7 distinct, concise, and actionable style guidelines or descriptive phrases. These guidelines should capture the character's overall essence, demeanor, and how they present themselves to the world. They are NOT for dialogue, but for their general being, personality, and non-verbal communication style.

Focus on phrases that could inform an artist, writer, or actor about the character's fundamental nature and typical presentation.
Avoid clichés unless they are genuinely fitting and can be expressed uniquely.

Examples of desired output format (one phrase per line):
- Always carries a worn leather-bound book
- Has a nervous habit of adjusting their glasses
- Speaks with a quiet intensity, rarely raising their voice
- Moves with an understated elegance
- Often seen with a skeptical smirk

Output ONLY the guideline phrases, one per line. Do not add numbers, bullets, or any extra commentary.
    `;

    const suggestions = await getChatSuggestions(prompt);

    if (typeof displaySuggestions === 'function') {
      displaySuggestions(suggestions, containerId, 'general');
    } else {
      console.error('displaySuggestions function is not available from script.js');
      if (container) container.innerHTML = '<span class="error-suggestions">Error: UI display function not found.</span>';
    }

  } catch (err) {
    console.error("Error in getAndDisplayGeneralStyleSuggestions:", err);
    if (container) {
      container.innerHTML = `<span class="error-suggestions">Error fetching suggestions: ${err.message}</span>`;
    }
  }
}

// --- CHAT STYLE SUGGESTIONS --- //
async function getAndDisplayChatStyleSuggestions() {
  const containerId = 'chatStyleSuggestions';
  const container = document.getElementById(containerId);
  
  // Ensure characterData is available
  const characterData = window.characterData || {
    name: "",
    bio: [],
    lore: [],
    adjectives: [],
    generalStyle: []
  };

  try {
    const charName = characterData.name || "the character";
    const bioText = characterData.bio?.join(' ') || "no bio provided";
    const loreText = characterData.lore?.join(' ') || "no lore provided";
    const adjectivesText = characterData.adjectives?.join(', ') || "no adjectives provided";
    const generalStyleText = characterData.generalStyle?.join('; ') || "no general style defined yet";

    const prompt = `
Character Name: ${charName}
Character Bio: ${bioText}
Character Lore: ${loreText}
Character Adjectives: ${adjectivesText}
Character General Style: ${generalStyleText}

Based on the character details above, generate 5-7 distinct, concise phrases or guidelines that describe this character's typical *speaking style* in a chat or dialogue context. Focus on their vocabulary, tone, common expressions, sentence structure, and any verbal tics or unique ways of phrasing things.

These suggestions should help someone write dialogue for the character. They should be actionable and illustrative of *how* the character speaks.

Examples of desired output format (one phrase per line):
- Often uses metaphors related to nature.
- Tends to ask rhetorical questions.
- Speaks in short, declarative sentences.
- Has a habit of ending sentences with '..., wouldn't you say?'
- Avoids contractions and speaks formally.
- Frequently uses dry wit or sarcasm.

Output ONLY the guideline phrases, one per line. Do not add numbers, bullets, or any extra commentary.
    `;

    const suggestions = await getChatSuggestions(prompt);

    if (typeof displaySuggestions === 'function') {
      displaySuggestions(suggestions, containerId, 'chat');
    } else {
      console.error('displaySuggestions function is not available from script.js');
      if (container) container.innerHTML = '<span class="error-suggestions">Error: UI display function not found.</span>';
    }

  } catch (err) {
    console.error("Error in getAndDisplayChatStyleSuggestions:", err);
    if (container) {
      container.innerHTML = `<span class="error-suggestions">Error fetching suggestions: ${err.message}</span>`;
    }
  }
}

// --- POST STYLE SUGGESTIONS --- //
async function getAndDisplayPostStyleSuggestions() {
  const containerId = 'postStyleSuggestions';
  const container = document.getElementById(containerId);
  
  // Ensure characterData is available
  const characterData = window.characterData || {
    name: "",
    bio: [],
    lore: [],
    adjectives: [],
    generalStyle: [],
    chatStyle: []
  };

  try {
    const charName = characterData.name || "the character";
    const bioText = characterData.bio?.join(' ') || "no bio provided";
    const loreText = characterData.lore?.join(' ') || "no lore provided";
    const adjectivesText = characterData.adjectives?.join(', ') || "no adjectives provided";
    const generalStyleText = characterData.generalStyle?.join('; ') || "no general style defined yet";
    const chatStyleText = characterData.chatStyle?.join('; ') || "no chat style defined yet";

    const prompt = `
Character Name: ${charName}
Character Bio: ${bioText}
Character Lore: ${loreText}
Character Adjectives: ${adjectivesText}
Character General Style: ${generalStyleText}
Character Chat Style: ${chatStyleText}

Based on all the character details above, generate 5-7 distinct, concise phrases or guidelines that describe this character's typical style when writing *posts* (e.g., for social media, forums, or a personal blog).

Consider elements such as:
- Formality/informality (e.g., slang, proper grammar)
- Use of emojis, hashtags, or other platform-specific conventions
- Typical length and structure of their posts
- Common topics they might post about or engage with
- Their likely tone (e.g., informative, opinionated, humorous, reflective, ranting)
- How they might interact with replies or comments
- Use of images, links, or other media (if inferable)

Examples of desired output format (one phrase per line):
- Writes long, reflective posts with complex sentences.
- Frequently uses #sarcasm and ironic emojis.
- Posts short, punchy updates with lots of exclamation points!!!
- Often shares links to obscure academic articles.
- Engages in lengthy debates in comment sections.
- Prefers to communicate through images with minimal text.

Output ONLY the guideline phrases, one per line. Do not add numbers, bullets, or any extra commentary.
    `;

    const suggestions = await getChatSuggestions(prompt);

    if (typeof displaySuggestions === 'function') {
      displaySuggestions(suggestions, containerId, 'post');
    } else {
      console.error('displaySuggestions function is not available from script.js');
      if (container) container.innerHTML = '<span class="error-suggestions">Error: UI display function not found.</span>';
    }

  } catch (err) {
    console.error("Error in getAndDisplayPostStyleSuggestions:", err);
    if (container) {
      container.innerHTML = `<span class="error-suggestions">Error fetching suggestions: ${err.message}</span>`;
    }
  }
}

  // Helper functions for parsing message example pairs
  function parseAllMessagePairs(text, characterName) {
    // This regex looks for "User says:" and then captures everything until the next "User says:" or end of string.
    // The detailed parsing of "{Name} says:" will be handled by parseMessageExamplePair.
    const pattern = /(User says:[\s\S]*?)(?=User says:|$)/gi;
    const matches = text.match(pattern);
  
    if (!matches) return [];
    const results = [];
    matches.forEach(m => {
      // Pass characterName to the parsing function
      const pair = parseMessageExamplePair(m, characterName); 
      if (pair) results.push(pair);
    });
    return results;
  }
  
  function parseMessageExamplePair(chunk, characterName) { // Added characterName parameter
    const userPrefix = "User says:";
    // Construct the character prefix dynamically
    const charPrefix = `${characterName || 'Character'} says:`; // Use fallback if name is empty
  
    const lowerChunk = chunk.toLowerCase(); // Renamed to avoid conflict with 'characterName'
    const lowerUserPrefix = userPrefix.toLowerCase();
    const lowerCharPrefix = charPrefix.toLowerCase();

    const userIndex = lowerChunk.indexOf(lowerUserPrefix);
    const charIndex = lowerChunk.indexOf(lowerCharPrefix);

    // Ensure charIndex is after userIndex and both are found
    if (userIndex === -1 || charIndex === -1 || charIndex < userIndex) return null;

    const userText = chunk.substring(userIndex + userPrefix.length, charIndex).trim();
    const charText = chunk.substring(charIndex + charPrefix.length).trim();
    return { user: userText, character: charText };
  }
