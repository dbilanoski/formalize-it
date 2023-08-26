// This one will target gmail site
/* 
  Notes
  * To select the new mail window, repeating property which can be used to target it seems to be g_editable=true
  * Problem is that content scripts execute only once and I need this available all the time during gmail usage. So will use setInterval to keep the contents of the content script runing
  * Then I need a for loop for multiple inboxes case
*/

setInterval(() => {
  // Grab all new email forms and loop over them
  const newMailForm = document.querySelectorAll("div[g_editable]");

  newMailForm.forEach((current)=> {

    // Check if there is already attached button or a parent element at all
    if(current.parentNode && current.parentNode.querySelector(".magic-button-container") == null) {
      
      // If not, there is no button so add it
      insertMagicButton(current);
      
      // Add event listener for clicking on the button
      /* 
          NOTE:
            * using mousedown as I need to stay in the same element to get correct user selection object
            * click would fire after the release of the button which would change the cursor position
            * https://developer.mozilla.org/en-US/docs/Web/API/Element/mousedown_event
      */
      current.parentNode.querySelector(".magic-button-container").addEventListener("mousedown", async () => {
            
        // Reset button color
        const button = current.parentNode.querySelector(".magic-button-icon");
        if(button.classList.contains("error")) {
          button.classList.remove("error")
        }

        // Grab user selection object
        let userSelection = window.getSelection();

        // Convert it to string
        emailContent = userSelection.toString() || null;

        // If nothing is selected, alert user and exit
        if (emailContent == null || emailContent.length < 1 || emailContent.replaceAll("\n","") == "") {
          button.classList.add("error");
          alert("Cannot work with empty email. Highlight desired text.")
          return;
        }

        // Grab selection range for swapping
        const selectedRange = userSelection.getRangeAt(0)

        // Delete content of selected range
        selectedRange.deleteContents();

        // Create new element, add the loading animation class name and append it to selection
        newNode = document.createElement("div");
        newNode.classList.add("lds-dual-ring");
        selectedRange.insertNode(newNode);

        try {
        // Fetch from OpenAI and extract the completion text
          const processedEmailPayload = await fetchFromOpenai(emailContent);
          let processedEmailContent = processedEmailPayload.choices[0].text;

          // Create new element to hold the text
          newNode = document.createElement("div");
          newNode.classList.add("formalizeit-insertion")

          // Add processed email content to the newly created element
          newNode.innerText = processedEmailContent;

          // Delete inserted animation element
          current.parentNode.querySelector(".lds-dual-ring").remove();

          // Append new element with processed email content to the DOM
          selectedRange.insertNode(newNode);
        } catch (error) {
            // Set button color
            button.classList.add("error");

            // Log error to the console
            console.log("Something went wrong while talking to OpenAI. Check your OpenAI API key and related settings.")
            console.log(error);

            // Return original text
            newNode = document.createElement("div");

            // Add processed email content to the newly created element
            newNode.innerText = emailContent;

            // Delete inserted animation element
            current.parentNode.querySelector(".lds-dual-ring").remove();

            // Append new element with original content to the DOM
            selectedRange.insertNode(newNode);
        }  
    })
  }

    /*
      NOTES:
        * Idea was to change the email content automatically but due to complexity and dynamic nature of the gmail DOM and differences with text to element separation between reply, compose new and in relation to the presence of the signature, I decided to have the user highlight the desired text and then work with that object and range

        * https://developer.mozilla.org/en-US/docs/Web/API/Range
        * https://stackoverflow.com/questions/2139616/window-getselection-gives-me-the-selected-text-but-i-want-the-html
    */
  })

}, 1000)


// OPENAI FETCHING
  /*
    NOTES:
      * Model replacement for davinci-003 which is to be deprecated - gpt-3.5-turbo-instruct
  */
 

async function fetchFromOpenai(inputData) {
  // API endpoint
  const openaiURL = "https://api.openai.com/v1/completions";
  
  // Get API key from Chrome local storage
  const apiKey = await chrome.storage.local.get(["openaiApiKey"]);
  
  // In case it's not there, exit function
  if(!apiKey.openaiApiKey) {
    // console.log("No OpenAI configuration found. Please add your API settings in the extension popup menu.")
    console.log("Check your OpenAI API Settings");
    return null
  }

  // Get email content
  const emailBody = inputData;
  
  if (!emailBody || emailBody == "" || emailBody.replaceAll("\n","") == ""){
    console.log("Email blank");
    return null
  }

  const response = await fetch(openaiURL, {
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey.openaiApiKey}`,
    },
    body: JSON.stringify({
      "model": "text-davinci-003",
      "prompt": `Take the following email and make it more formal, proffesional, polite and gramatically correct while not changing the content or main intention at all. Assume that person from the signature at the end of the email is the sender and do not address email to that person when the reciever is not specified. Email: "${emailBody}"`,
      "max_tokens": 256,
      "temperature": 0.6
    })
  })

  const data = await response.json();
  return data;
}

// MAGIC BUTTON PROCEDURES

// Add button function
function insertMagicButton(element) {
  // For button svg I'm using https://pictogrammers.com/ to grab the svg code for the magic wand icon
  // Template button
  const buttonTemplate = `
  <div class="magic-button-container">
    <svg class="magic-button-icon" id="magic-button" "xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <title>FormalizeIt</title>
      <path fill="currentColor" path d="M7.5,5.6L5,7L6.4,4.5L5,2L7.5,3.4L10,2L8.6,4.5L10,7L7.5,5.6M19.5,15.4L22,14L20.6,16.5L22,19L19.5,17.6L17,19L18.4,16.5L17,14L19.5,15.4M22,2L20.6,4.5L22,7L19.5,5.6L17,7L18.4,4.5L17,2L19.5,3.4L22,2M13.34,12.78L15.78,10.34L13.66,8.22L11.22,10.66L13.34,12.78M14.37,7.29L16.71,9.63C17.1,10 17.1,10.65 16.71,11.04L5.04,22.71C4.65,23.1 4,23.1 3.63,22.71L1.29,20.37C0.9,20 0.9,19.35 1.29,18.96L12.96,7.29C13.35,6.9 14,6.9 14.37,7.29Z" />
    </svg>
  </div>
  `
  // Attach the button to the current form
  element.insertAdjacentHTML("beforebegin", buttonTemplate);
}

