$(function(){
	const socket = io()
	
	const username_input = $(".username-input")
	const send_username = $("#send-username")
	const message_input = $(".message-input")
	const send_message = $("#send-message")
	const message_list = $(".message-list")

	// event listeners

	// add listener for "enter" key
	// and simulate a click
	username_input.keypress((event) => {
		if (event.keyCode === 13) {
			send_username.click()
		}
	})

	message_input.keypress((event) => {
		if (event.keyCode === 13) {
			send_message.click()
		}
	})

	send_username.click(() => {
		socket.emit('set_username', $(".username-input").val())
	})

	send_message.click(() => {
		socket.emit('new_message', message_input.val())
		message_input.val('')
	})

	// socket listeners
	socket.on('new_message', (data) => {
		message_list.append('<div class="message">' + data.username + ': ' + data.message + '</div>')
	})

	socket.on('next_in_line', (data) => {
		// add waiting state view
		const message = 'Sorry ' + data.username + ', but there\'s one available to chat. We\'ll pair you with the next person who joins!'
		$("body").append('<div id="next-in-line">' + message + '</div>')
	})

	socket.on('end_chat', (data) => {
		// clear out chat and add waiting state view
		$(".username").remove()
		$(".message-input-container").css("visibility", "hidden")
		message_list.empty()
		// message depends on whether user disconnected or hopped
		const message = data.hop ? "You've requested a new chat partner" : "Sorry " + data.u1 + ", " + data.u2 + " has left the chat."
		alert(message)
	})

	socket.on('username_accepted', () => {
		$(".username-input").remove()
		send_username.remove()
	})

	socket.on('chat_started', (data) => {
		// add active chat view
		$("#next-in-line").remove()
		$(".message-input-container").css("visibility", "visible")
		const message = 'Welcome ' + data.u1 + '! You\'re chatting with ' + data.u2
		$(".username-input-container").append('<div class="username">' + message + '</div>')
	})

	socket.on('username_in_use', () => {
		const message = 'This username is in use. Please choose a different one'
		alert(message)
		username_input.val('')
	})
})
