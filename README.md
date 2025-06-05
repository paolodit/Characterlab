# CharacterLab - ElizaOS Character Generator

[Live Version Available Here](https://www.twoguysonecat.com/characterlab/)

## Purpose

CharacterLab is a web-based application designed to simplify the creation and configuration of character files for the ElizaOS platform. It provides a user-friendly interface to define various attributes of an AI character, including:

*   **Basic Information**: Name, client compatibility.
*   **Core Personality**: System prompt, biography, lore, and defining adjectives.
*   **Knowledge & Interaction**: Knowledge base, conversation topics, message examples.
*   **Styling**: General, chat, and post styles.
*   **Advanced Settings**: AI model, voice model, and other configurations.

The primary goal of CharacterLab is to streamline the process of generating the JSON-formatted character files used by ElizaOS, making character creation accessible and efficient. This tool was created by **TwoGuysOneCat** ([www.twoguysonecat.com](https://www.twoguysonecat.com)).

## Project Structure

The project is a single-page web application with the following core files:

*   `index.html`: The main HTML file that structures the user interface and various input screens for character creation.
*   `script.js`: Contains all the JavaScript logic for the application. This includes:
    *   Managing UI interactions and navigation between different character creation steps.
    *   Handling data input and saving character progress to the browser's local storage.
    *   Generating suggestions for character attributes (e.g., bio, system prompt) via API calls.
    *   Exporting the final character data as a JSON file (`.json`).
*   `styles.css`: Provides the CSS rules for the visual appearance and layout of the application.
*   `gpt.js`: This file manages all interactions with Large Language Models (LLMs) for generating creative suggestions (e.g., character names, bio lines). It handles API calls (defaulting to OpenAI, but supporting custom API providers via the 'Start' screen settings) and includes functionality to validate the provided API key.
*   `characterlab.png`: The logo image used in the application's header and as the website's favicon.

## Key Features

*   **Suggestion Generation**: Leverages LLMs to provide creative suggestions for various character attributes, speeding up the creative process (requires an API key).
*   **The Cast**: Allows you to save and manage multiple characters directly within your browser's local storage. This is useful for working on several character concepts simultaneously or revisiting previous work. Access The Cast from the "Start" screen.
*   **JSON Export**: Generates ElizaOS-compatible JSON character files for easy integration.

## API Key for Suggestions

To use the suggestion generation features within CharacterLab, you will need an API key from a Large Language Model (LLM) provider. The application is configured to work with OpenAI-compatible APIs.

You can obtain an API key from sources such as:

*   **Groq**: Often provides a generous free tier for their API, which is a great way to get started. Visit [groq.com](https://groq.com/) for more details.
*   **OpenAI**: Offers powerful models, typically on a paid basis. Visit [openai.com](https://openai.com/) for their API offerings.

Once you have an API key, enter it along with your chosen model and API provider URL (if not using the default OpenAI endpoint) in the "Start" section of CharacterLab to enable suggestions.

## License

This project is licensed under the MIT License.

**MIT License**

Copyright (c) 2025 TwoGuysOneCat

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Attribution

CharacterLab was created by **TwoGuysOneCat** ([www.twoguysonecat.com](https://www.twoguysonecat.com)).

---

This README provides a basic overview. Feel free to expand it with more details about setup, usage, or specific features as the project evolves.
