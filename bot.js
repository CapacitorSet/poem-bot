var TelegramBot = require('node-telegram-bot-api');

var config;

try {
	config = JSON.parse(require("fs").readFileSync("config.json", "utf8"));
} catch (e) {
	console.log("Error reading config.json!");
}

const bot = new TelegramBot(config.token, {polling: true});

var poems = {},
	usernames = {};

Object.prototype.filter = function(fn) {
	return Object.keys(poems).filter(key => fn(this[key]));
};

function getGroupId(fromId) {
	return poems.filter(poem => poem.teilnehmer.indexOf(fromId) != -1)[0];
}

function Poem(verses = [1, 2, 3, 4, 3, 2, 1]) {
	this.verses = verses;
	this.active = null;
	this.teilnehmer = [];
	this.requested = false;
	this.data = [];
	this.activate = function() {
		this.active = this.verses.shift();
	}
}

bot.on('message', function (msg) {
	console.log(msg);
	// Refresh usernames map
	usernames[msg.from.id] = msg.from.first_name;
	var text = msg.text ? msg.text.replace("@ritala_bot", "") : null,
		fromId = msg.from.id,
		chatId = msg.chat.id;
	if (text == "/help") {

	} else
	if (text == "/nuovapoesia") {
		return;
		bot.sendMessage(chatId, "test");
		if (msg.chat.type != "group") {
			bot.sendMessage(chatId, "Questo comando può essere usato solo in un gruppo.");
			return;
		}
		if (poems[chatId]) {
			bot.sendMessage(chatId, "Una nuova poesia è già attiva. Per cancellarla, usa /cancellapoesia.");
			return;
		}
		bot.sendMessage(chatId, "Nuova poesia creata! Ora, fai /entra.");
		poems[chatId] = new Poem();
	} else if (text == "/cancellapoesia") {
		if (msg.chat.type != "group") {
			bot.sendMessage(chatId, "Questo comando può essere usato solo in un gruppo.");
			return;
		}
		var groupId = getGroupId(fromId);
		if (!groupId) {
			bot.sendMessage(chatId, "Non sembri essere in nessuna poesia. Fai /entra.");
			return;
		}
		bot.sendMessage(groupId, `La poesia è stata cancellata da ${msg.from.first_name}.`);
		delete poems[chatId];
	} else if (text == "/entra") {
		if (!poems[chatId]) {
			bot.sendMessage(chatId, "Non è attiva nessuna poesia. Fai /nuovapoesia per generarne una.");
			return;
		}
		if (poems[chatId].teilnehmer.indexOf(fromId) == -1)
			poems[chatId].teilnehmer.push(fromId);
		bot.sendMessage(chatId, "Partecipanti: " + poems[chatId].teilnehmer.map(x => usernames[x]).join(", "));
	} else if (text == "/richiedi") {
		var groupId = getGroupId(fromId);
		if (!groupId) {
			bot.sendMessage(chatId, "Non sembri essere in nessuna poesia. Fai /entra.");
			return;
		}
		if (poems[groupId].requested) {
			bot.sendMessage(chatId, `Questo verso è prenotato da ${usernames[poems[groupId].requested]}.`);
			return;
		}
		poems[groupId].activate();
		bot.sendMessage(groupId, `${msg.from.first_name} ha prenotato un verso.`);
		bot.sendMessage(chatId, `Ora devi scrivere un verso di ${poems[groupId].active} parole.`);
		poems[groupId].requested = fromId;
	} else if (text.match(/\/scrivi/)) {
		var groupId = getGroupId(fromId);
		if (!groupId) {
			bot.sendMessage(chatId, "Non sembri essere in nessuna poesia. Fai /entra.");
			return;
		}
		if (!poems[groupId].requested) {
			bot.sendMessage(chatId, "Fai /richiedi per prenotare questo verso.");
			return;
		}
		if (poems[groupId].requested != fromId) {
			bot.sendMessage(chatId, `Questo verso è prenotato da ${usernames[poems[groupId].requested]}.`);
			return;
		}
		var testo = text.replace(/^\/scrivi +/, "");
		if (testo.match(/ /g) && testo.match(/ /g).length != (poems[groupId].active - 1)) {
			bot.sendMessage(chatId, `Devi scrivere ${poems[groupId].active} parole.`);
			return;
		}
		poems[groupId].data.push(testo);
		bot.sendMessage(groupId, `${msg.from.first_name} ha scritto un verso.`);
		bot.sendMessage(chatId, "Scritto!");
		poems[groupId].requested = false;
		if (poems[groupId].verses.length == 0) {
			bot.sendMessage(groupId, poems[groupId].data.join("\n"));
			delete poems[groupId];
			return;
		}
	} else
	if (text == "/ricorda") {
		var groupId = getGroupId(fromId);
		if (!groupId) {
			bot.sendMessage(chatId, "Non sembri essere in nessuna poesia.");
			return;
		}
		if (!poems[groupId].requested) {
			bot.sendMessage(chatId, "Il verso non è prenotato.");
			return;
		}
		bot.sendMessage(chatId, `Il verso è prenotato da ${usernames[poems[groupId].requested]}.`);
		bot.sendMessage(poems[groupId].requested, "Ti è stato ricordato di scrivere il verso.");
	}
});
