import express from 'express'
import http from 'http'
import io from 'socket.io'

const app = express()
const server = http.Server(app)
const ioConnected = io(server)

// dictionary of users structured as:
// {socketId: {username, partnerSocketId}}
const users = {}

// person waiting for match
let waitingUserId = null

// "second in line" after a user hops on them and
// no one else is available (waitingUserId === null)
let abandonedAfterHop = null

app.use(express.static('src'))

app.get('/', (req, res) => {
	res.sendFile('index.html', {root: __dirname + '/../views/'})
})

server.listen(3000, () => {
	console.log('listening on *:3000')
})


// since the users dict is keyed by socket id, duplicate usernames isn't really an issue;
// but good to have/reduces confusion for users
const usernameInUse = (username) => {
	return Object.keys(users).some(user => {
		return users[user]['username'] === username
	})
}

ioConnected.on('connection', (socket) => {
	console.log('a user has connected')

	socket.on('set_username', (username) => {
		if (usernameInUse(username)) {
			ioConnected.to(`${socket.id}`).emit('username_in_use')
		} else {
			ioConnected.to(`${socket.id}`).emit('username_accepted')
			users[socket.id] = {}
			users[socket.id].username = username
			if (waitingUserId) { // check if someone is available to chat and match up with current user
				users[socket.id].partner = waitingUserId
				users[waitingUserId].partner = socket.id
				initiateChat(socket.id, waitingUserId)
				// update waiters
				waitingUserId = abandonedAfterHop
				abandonedAfterHop = null
			} else { // if not, put current user in waiting state
				waitingUserId = socket.id
				ioConnected.to(`${socket.id}`).emit('next_in_line', {username})
			}
		}
	})

	socket.on('new_message', (message) => {
		const splitMessage = message.split(' ')
		if (splitMessage[0] === '/hop') {
			handleHop(socket.id)
		} else {
			let messageToSend = message
			let delayTime = 0
			if (splitMessage[0] === '/delay') { // only handles proper formatting (/command ms text)
				delayTime = splitMessage[1]
				messageToSend = splitMessage.splice(2).join(' ') // reconstruct the message text
			} 
			ioConnected.to(`${socket.id}`).emit('new_message', {message: messageToSend, username: users[socket.id]['username']})
			setTimeout(() => { 
				ioConnected.to(`${users[socket.id]['partner']}`).emit('new_message', {message: messageToSend, username: users[socket.id]['username']}) 
			}, delayTime)	
		}
	})

	socket.on('disconnect', () => {
		console.log('user disconnected')
		if (waitingUserId === socket.id) { // waiting user has disconnected
			waitingUserId = null
		} else {
			// let partner of disconnecting user know their chat has ended
			const abandonedUser = users[socket.id]['partner']
			ioConnected.to(`${abandonedUser}`).emit('end_chat', {u1: users[abandonedUser]['username'], u2: users[socket.id]['username']})
			if (waitingUserId) { // someone else immediatley available to chat
				users[abandonedUser]['partner'] = waitingUserId
				users[waitingUserId]['partner'] = abandonedUser
				initiateChat(abandonedUser, waitingUserId)
				// update waiters
				waitingUserId = abandonedAfterHop 
				abandonedAfterHop = null
			} else { // abandoned user must wait for someone else to join
				waitingUserId = abandonedUser
				ioConnected.to(`${abandonedUser}`).emit('next_in_line', {username: users[abandonedUser]['username']})
			}
		}
		// remove disconnected user from dictionary of users
		delete users[socket.id]
	})

	// initiate a chat between two people
	function initiateChat(sid1, sid2) {
		ioConnected.to(`${sid1}`).emit('chat_started', {u1: users[sid1]['username'], u2: users[sid2]['username']})
		ioConnected.to(`${sid2}`).emit('chat_started', {u1: users[sid2]['username'], u2: users[sid1]['username']})
	}

	function handleHop(sid) {
		const abandonedUser = users[sid]['partner'] // user that was "hopped" on
		// let both abandoned user and hopping user know the chat has ended
		ioConnected.to(`${abandonedUser}`).emit('end_chat', {u1: users[abandonedUser]['username'], u2: users[sid]['username']})
		ioConnected.to(`${sid}`).emit('end_chat', {hop: true})
		if (waitingUserId) { // someone is available for hopping user to chat with
			users[sid]['partner'] = waitingUserId
			users[waitingUserId]['partner'] = sid
			initiateChat(sid, waitingUserId)
			waitingUserId = abandonedUser
		} else {
			// both users must wait for someone to join
			waitingUserId = sid
			abandonedAfterHop = abandonedUser
			ioConnected.to(`${sid}`).emit('next_in_line', {username: users[sid]['username']})
		}
		ioConnected.to(`${abandonedUser}`).emit('next_in_line', {username: users[abandonedUser]['username']})
	}
})
