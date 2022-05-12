import view from './view.js';
import controller from './notifications-controller.js';
import translate from './translate-service.js';
import config from './config.js';

// Obtain a reference to the platformClient object
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

// API instances
const usersApi = new platformClient.UsersApi();
const conversationsApi = new platformClient.ConversationsApi();
const responseManagementApi = new platformClient.ResponseManagementApi();

let userId = '';
let agentName = 'AGENT_NAME';
let agentAlias = 'AGENT_ALIAS';
let customerName = 'CUSTOMER_NAME';
let currentConversation = null;
let currentConversationId = '';
let translationData = null;
let genesysCloudLanguage = 'en-us';
let messageType = '';
let messageIds = [];

/**
 * Callback function for 'message' and 'typing-indicator' events.
 * 
 * @param {Object} data the event data  
 */
let onMessage = (data) => {
    console.log(JSON.stringify(data));

    if(messageType === 'chat'){
        switch(data.metadata.type){
            case 'typing-indicator':
                break;
            case 'message':
                // Values from the event
                let eventBody = data.eventBody;
                let message = eventBody.body;
                let senderId = eventBody.sender.id;
    
                // Conversation values for cross reference
                let participant = currentConversation.participants.find(p => p.chats[0].id == senderId);
                let name = '';
                let purpose = '';
    
                if(participant.name != null) {
                    name = participant.name;
                    purpose = participant.purpose;
                } else {
                    name = 'BOT';
                    purpose = 'agent';
                }
    
                // Wait for translate to finish before calling addChatMessage
                translate.translateText(message, genesysCloudLanguage, function(translatedData) {
                    view.addChatMessage(name, translatedData.translated_text, purpose);
                    translationData = translatedData;
                });
    
                break;
        }
    } else if (messageType === 'message') {
        let messageId = '';
        let purpose = '';
        let name = '';

        var messages = [];
        var participantPurposes = [];
        var publish = false;
        var mostRecentMessageTime = '';

        // Discard unwanted notifications
        if (data.topicName.toLowerCase() === 'channel.metadata') {
            // Heartbeat
            //console.info('Ignoring metadata: ', notification);
            return;
        } else if (data.eventBody.participants.find(p => p.purpose == 'customer').endTime) {
            console.log('ending conversation');
        } else {
            data.eventBody.participants.forEach((participant) => {
                if(!participant.endTime) {
                    messages.push(participant.messages[0].messages[participant.messages[0].messages.length-1]);
                    participantPurposes.push(participant.purpose);
                }
            });

            for (var x=0; x<messages.length; x++) {
                console.log('messageTime: ' + messages[x].messageTime);
                if (messages[x].messageTime > mostRecentMessageTime) {
                    mostRecentMessageTime = messages[x].messageTime;
                    messageId = messages[x].messageId;
                    purpose = participantPurposes[x];
                    publish = true;
                }
            }

            name = (purpose === 'customer') ? customerName : agentAlias

            if (publish) {
                conversationsApi.getConversationsMessageMessage(data.eventBody.id, messageId)
                .then((messageDetail => {
                    // Make sure message is published only once
                    if(!messageIds.includes(messageId)){
                        messageIds.push(messageId);

                        // Wait for translate to finish before calling addChatMessage
                        translate.translateText(messageDetail.textBody, genesysCloudLanguage, function(translatedData) {
                            view.addChatMessage(name, translatedData.translated_text, purpose);
                            translationData = translatedData;
                        });
                    }                    
                }));          
            }            
        }
    }    
};

/**
 *  Translate then send message to the customer
 */
function sendChat(){
    let message = document.getElementById('message-textarea').value;

    // Get the last agent participant, this also fixes an issue when an agent
    // gets reconnected and reassigned a new participant id.
    let agentsArr = currentConversation.participants.filter(p => p.purpose == 'agent');
    let agent = agentsArr[agentsArr.length - 1];
    let communicationId = '';

    if(messageType === 'chat') {
        communicationId = agent.chats[0].id;
    } else if (messageType === 'message') { 
        communicationId = agent.messages[0].id;
    }

    let sourceLang;

    // Default language to english if no source_language available    
    if(translationData === null) {
        sourceLang = 'en';
    } else {
        sourceLang = translationData.source_language;
    }

    // Translate text to customer's local language
    translate.translateText(message, sourceLang, function(translatedData) {
        // Wait for translate to finish before calling sendMessage
        sendMessage(translatedData.translated_text, currentConversationId, communicationId);
    });

    document.getElementById('message-textarea').value = '';
};

/**
 *  Send message to the customer
 */
function sendMessage(message, conversationId, communicationId){
    console.log(message);

    if(messageType === 'chat') {
        conversationsApi.postConversationsChatCommunicationMessages(
            conversationId, communicationId,
            {
                'body': message,
                'bodyType': 'standard'
            }
        )
    } else if (messageType === 'message') { 
        conversationsApi.postConversationsMessageCommunicationMessages(
            conversationId, communicationId,
            {
                'textBody': message
            }
        )
    }    
}

/**
 * Show the chat messages for a conversation
 * @param {String} conversationId 
 * @returns {Promise} 
 */
function showChatTranscript(conversationId){
    if(messageType === 'chat'){
        return conversationsApi.getConversationsChatMessages(conversationId)
        .then((data) => {
            // Show each message
            data.entities.forEach((msg) => {
                if(msg.hasOwnProperty('body')) {
                    let message = msg.body;

                    // Determine the name by cross referencing sender id 
                    // with the participant.chats.id from the conversation parameter
                    let senderId = msg.sender.id;
                    let name = currentConversation
                                .participants.find(p => p.chats[0].id == senderId)
                                .name;
                    let purpose = currentConversation
                                .participants.find(p => p.chats[0].id == senderId)
                                .purpose;

                    // Wait for translate to finish before calling addChatMessage
                    translate.translateText(message, genesysCloudLanguage, function(translatedData) {
                        view.addChatMessage(name, translatedData.translated_text, purpose);
                        translationData = translatedData;
                    });
                }
            });
        });
    } else if (messageType === 'message') {
        return conversationsApi.getConversation(conversationId)
        .then((data) => {
            data.participants.forEach((participant) => {
                if(participant.purpose === 'customer' || participant.purpose === 'agent') {
                    participant.messages.forEach((message) => {
                        message.messages.forEach((msg) => {
                            messageIds.push(msg.messageId);
                        })
                    })
                }
            });

            return conversationsApi.postConversationsMessageMessagesBulk(conversationId, { 'body': messageIds })
        }).then((data) => {
            data.entities.reverse();

            // Show each message
            data.entities.forEach((msg) => {
                let message = msg.textBody;
                let name = '';
                let purpose = '';

                if(msg.direction === 'inbound') {
                    name = customerName;
                    purpose = 'customer';
                } else {
                    name = agentAlias;
                    purpose = 'agent'
                }

                // Wait for translate to finish before calling addChatMessage
                translate.translateText(message, genesysCloudLanguage, function(translatedData) {
                    view.addChatMessage(name, translatedData.translated_text, purpose);
                    translationData = translatedData;
                });
            });
        });
    }
}

/**
 * Set-up the channel for chat conversations
 * @param {String} conversationId 
 * @returns {Promise}
 */
function setupChatChannel(conversationId){
    return controller.createChannel()
    .then(data => {
        // Subscribe to all incoming messages
        return controller.addSubscription(
            `v2.users.${userId}.conversations`,
            onMessage)
        .then(data => {
            return controller.addSubscription(
                `v2.conversations.chats.${conversationId}.messages`,
                onMessage);
        });
    });
}

/**	
 * This toggles between translator and canned response iframe	
 */	
function toggleIframe(){	
    let label = document.getElementById('toggle-iframe').textContent;	

    if(label === 'Open Chat Translator'){	
        document.getElementById('toggle-iframe').textContent = 'Open Canned Responses';
        document.getElementById('agent-assist').style.display = 'block';
        document.getElementById('canned-response-container').style.display = 'none';
    } else {	
        document.getElementById('toggle-iframe').textContent = 'Open Chat Translator';
        document.getElementById('agent-assist').style.display = 'none';
        document.getElementById('canned-response-container').style.display = 'block';
        
        // Only call getLibraries function if element does not have a child
        if(document.getElementById('libraries-container').childNodes.length == 0) getLibraries();
    }	
}

/** --------------------------
 *  CANNED RESPONSE FUNCTIONS
 * ------------------------ */
/**
 * Get all libraries in the org
 */
 function getLibraries(){    
    return responseManagementApi.getResponsemanagementLibraries()
    .then((libraries) => {
        libraries.entities.forEach((library) => {
            getResponses(library.id, library.name);
        });
    });
}

/**
 * Get all responses of each library
 * @param {String} libraryId 
 * @param {String} libraryName 
 */
function getResponses(libraryId, libraryName){
    return responseManagementApi.getResponsemanagementResponses(libraryId)
    .then((responses) => {
        view.displayLibraries(libraryId, libraryName);

        responses.entities.forEach((response) => {
            view.displayResponses(response, doResponseSubstitution);
        });
    });
}

/**
 * Search all responses in the org
 * @param {String} query 
 */
function searchResponse(query){
    return responseManagementApi.postResponsemanagementResponsesQuery({'queryPhrase': query})
    .then((responses) => {
        responses.results.entities.forEach((response) => {
            view.toggleDIVs();
            view.displaySearchResults(response, doResponseSubstitution);
        });
    });
}

/**
 * Replaces the dynamic variables in canned responses with appropriate
 * values. This function is used in the view when an agent clicks a response.
 * @param {String} text 
 * @param {String} responseId 
 */
function doResponseSubstitution(text, responseId){
    let finalText = text;

    // Do the default substitutions first
    finalText = finalText.replace(/{{AGENT_NAME}}/g, agentName);
    finalText = finalText.replace(/{{CUSTOMER_NAME}}/g, customerName);
    finalText = finalText.replace(/{{AGENT_ALIAS}}/g, agentAlias);
    

    let participantData = currentConversation.participants
                            .find(p => p.purpose == 'customer').attributes;

    // Do the custom substitutions
    return responseManagementApi.getResponsemanagementResponse(responseId)
    .then((responseData) => {
        let subs = responseData.substitutions;
        subs.forEach(sub => {
            let subRegex = new RegExp(`{{${sub.id}}}`, 'g');
            let val = `{{${sub.id}}}`;

            // Check if substitution exists on the participant data, if not
            // use default value
            if(participantData[sub.id]){
                val = participantData[sub.id];
            } else {
                val = sub.defaultValue ? sub.defaultValue : val;
            }

            finalText = finalText.replace(subRegex, val);
        });

        return finalText;
    })
    .catch(e => console.error(e));
}    

/** --------------------------------------------------------------
 *                       EVENT HANDLERS
 * -------------------------------------------------------------- */
document.getElementById('toggle-iframe')	
    .addEventListener('click', () => toggleIframe());

document.getElementById('chat-form')
    .addEventListener('submit', () => sendChat());

document.getElementById('btn-send-message')
    .addEventListener('click', () => sendChat());

document.getElementById('message-textarea')
    .addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendChat();
            if(e.preventDefault) e.preventDefault(); // prevent new line
            return false; // Just a workaround for old browsers
        }
    });

document.getElementById('find-response-btn')
    .addEventListener('click', function(){
        let query = document.getElementById('find-response').value;
        searchResponse(query);
    });

document.getElementById('find-response')
    .addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            let query = document.getElementById('find-response').value;
            searchResponse(query);
        }
    });

document.getElementById('toggle-search')
    .addEventListener('click', () => view.toggleDIVs());

/** --------------------------------------------------------------
 *                       INITIAL SETUP
 * -------------------------------------------------------------- */
const urlParams = new URLSearchParams(window.location.search);
currentConversationId = urlParams.get('conversationid');
genesysCloudLanguage = urlParams.get('language');

client.setPersistSettings(true, 'chat-translator');
client.setEnvironment(config.genesysCloud.region);
client.loginImplicitGrant(
    config.clientID,
    config.redirectUri,
    { state: JSON.stringify({
        conversationId: currentConversationId,
        language: genesysCloudLanguage
    }) })
.then(data => {
    console.log(data);

    // Assign conversation id
    let stateData = JSON.parse(data.state);
    currentConversationId = stateData.conversationId;
    genesysCloudLanguage = stateData.language;
    
    // Get Details of current User
    return usersApi.getUsersMe();
}).then(userMe => {
    userId = userMe.id;
    agentName = userMe.name;
    agentAlias = agentName ? agentName : agentAlias;

    // Get current conversation
    return conversationsApi.getConversation(currentConversationId);
}).then((conv) => { 
    currentConversation = conv;
    let customer = conv.participants.find(p => p.purpose == 'customer')

    if(customer.chats.length > 0) {
        messageType = 'chat';
        customerName = customer.name;
    } else if (customer.messages.length > 0){
        messageType = 'message';
        customerName = 'customer';
    }

    return setupChatChannel(currentConversationId);
}).then(data => { 
    // Get current chat conversations
    return showChatTranscript(currentConversationId);
}).then(data => {
    console.log('Finished Setup');

// Error Handling
}).catch(e => console.log(e));
