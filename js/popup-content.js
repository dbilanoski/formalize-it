// Grab input element
const inputField = document.getElementById("apiKey");

// Get data from Chrome local storage
  /* Note: 
    * Since it is asycnrhorous, need to await the promise resolution before continuing with the app 
    * To use simple await paradigm without an async function, script tag in the html inclusion needs to have the type="module" so await can be used at the top level
    * Example: <script defer src="js/content.js" type="module"></script>
  */

const storageData = await chrome.storage.local.get(["openaiApiKey"])

// If there is stored value, adjust input filed value so user knows there is an entry
if (storageData.openaiApiKey) {
  inputField.value = "Key configured"
}

// Listen for change events on the input field to trigger update function
inputField.addEventListener("change", setApiKey);

// Storage update function
function setApiKey(e) {
  // Validation
  if(e.target.value == "" || !e.target.value){
    alert("Cannot work with empty keys.")
    return;
  }
  // Update chrome storage
  chrome.storage.local.set({"openaiApiKey": e.target.value});

  // Alert the user
  alert("API configured: "+e.target.value)

  // Update input field value so user has the visual feedback
  inputField.value = "Key configured"
}

// Show API button logic
const apiButton = document.getElementById("show-api-key");

apiButton.addEventListener("click", async (e) => {
  // Grab the key from Chrome local storage
  const currentKey = await chrome.storage.local.get(["openaiApiKey"]);

  // In case it's empty, notify the user
  if (!currentKey.openaiApiKey || currentKey.openaiApiKey == "" || currentKey.openaiApiKey == null) {
    alert("API key is not configured. Please configure your OpenAI API key.")
    return
  }
  
  // Notify user about the current key
  alert("CAUTION! Sharing your API keys is not a good idea. \nCurrently stored key:\n"+currentKey.openaiApiKey);

})