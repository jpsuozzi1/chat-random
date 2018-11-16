# chat-random

### Overview

This project is an online chat application that allows two users to be randomly matched to chat. It uses Node.js with express and the socket.io library.

### Implementation and Code Structure

The project is built with babel so that ES6 syntax can be used. In the root of the project is index.js which holds code to start up the server and handle server-side socket events. 

Inside the src folder is chat.js, the script that handles client-side socket events and updates the DOM accordingly.

Lastly, the views folder contains index.html, the skeleton layout of the app that changes throughout the flow of the app.

### Design Decisions and Questions

While doing this project, I made many design decisions about my implementation, some of which I still have questions about. I've documented some of these decisions here for reference.

1) I chose to use a regular JavaScript object as opposed to a Map to store user and chat information. A plain object was sufficient for this application and a Map would perform no better for the operations used in this project. 

2) When tracking specific chats between two people, I considered using the "room" feature of socket.io and putting chat partners into a room together. I eventually decided to just use the users dictionary I was already using to track usernames and added another property to store the socket id of that person's chat partner. This seemed like a much simpler way to track the information needed without any overhead.

3) Initially, I had the server send back response messages to the client when emitting an event, and the client would display them. I eventually decided to only send back relevant data, such as usernames, and let the client handle constructing the message based on that data.

4) To implement the /delay command, I used Node's setTimeout() function in socket.on('new_message'). I made the choice to start with a delay of 0 and change it if /delay is called, so that setTimeout() is called regardless of the user calling /delay. I am aware that if the delayed callback function has a delay of 0, it will still be executed after everything else in the queue. However, I assumed that if the callback function is the last thing to be exectued in its parent function, then this would not delay its execution. 

5) A user disconnecting (socket.on('disconnect')) and a user calling /hop (handleHop function) have very similar implementations in my code, however, there are some slight differences between the two. I was unsure if I should try to encapsulate the code into one function or leave them as two separate cases. It felt forced to put them together, so I left them independent. 

6) Lastly, when a user both disconnects and calls /hop, an end_chat event is emitted. In order to differentiate between the two so the correct messages are displayed, I used a flag in the response to let the client know the reason. I was unsure if this implementation was acceptable, or if each case should be handled by a separate event since they have different messages.