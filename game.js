import { Chess, WHITE, BLACK } from "./chess.js";

// Initialize new game and board
let game = new Chess();
var board = Chessboard('board', 'start');

function resizeBoard() {
  var boardContainer = document.getElementById('board-container');
  var boardDiv = document.getElementById('board');
  var width = window.innerWidth;
  var height = window.innerHeight - 250;
  
  // Calculate the minimum dimension (width or height)
  var minDimension = Math.min(width, height);

  if(width > height)
    minDimension = height;

  // Set the board container's height based on the minimum dimension
  //boardContainer.style.width = minDimension + 'px';
  boardContainer.style.height = minDimension + 'px';
  boardDiv.style.width = minDimension + 'px';
  boardDiv.style.height = minDimension + 'px';

  console.log(minDimension + 'px');
  board.resize();
}

resizeBoard();

window.onresize = function() {
  resizeBoard();
}

// Load the API key from local storage when the page loads
document.addEventListener('DOMContentLoaded', (event) => {
  const apiKeyInput = document.querySelector('#api-key');
  const savedApiKey = localStorage.getItem('apiKey');

  if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
  }

  // Save the API key to local storage whenever it changes
  apiKeyInput.addEventListener('change', (event) => {
    localStorage.setItem('apiKey', event.target.value);
  });
});

// Function to handle piece movement
function onDragStart(source, piece, position, orientation) {
  // Do not pick up pieces if the game is over or it's not that side's turn
  if (game.isGameOver() || (game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
  if (document.getElementById('api-key').value === "") {
    alert('Please enter a valid API Key');
    return false;
  }
}

// Function to check if a move is legal
function onDrop(source, target) {
  // See if the move is legal
  try {
    var move = game.move({
      from: source,
      to: target,
      promotion: 'q' // Always promote to a queen for simplicity's sake
    });
  }
  catch (e) { }

  // If illegal move, snap back
  if (move === null) return 'snapback';

  // If legal move, check game status
  checkGameStatus();
}

function addMessageToChat(message, systemMessage = false) {
  var chatWindow = document.getElementById('chat-window');
  // Create the message container
  var messageContainer = document.createElement('div');
  messageContainer.classList.add('message-container');
  // Create the chat message
  var newMessage = document.createElement('div');
  if(!systemMessage)
    newMessage.classList.add('chat-message', 'rounded-border', 'shadow');
  else
    newMessage.classList.add('system-message', 'rounded-border', 'shadow');
  newMessage.textContent = message;
  // Append the chat message to the message container
  messageContainer.appendChild(newMessage);
  // Append the message container to the chat window
  chatWindow.appendChild(messageContainer);
  // Scroll to the bottom of the chat window
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

addMessageToChat("AI Thoughts will appear here!", true);

async function aiMove(invalidString = "") {
  let FEN = game.fen();
  let validMoves = game.moves().join(", ");
  let apiKey = document.getElementById('api-key').value;
  let promptText = document.getElementById('prompt-text').value;
  let squares = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  let allPieces = ['1', '2', '3', '4', '5', '6', '7', '8'];
  let piecesUnderAttack = [];
  let piecesYouCanAttack = [];

  for (let piece of allPieces) {
    for (let square of squares) {
      let squareToCheck = square + piece;
      if (game.isAttacked(squareToCheck, WHITE)) {
        let pieceUnderAttack = game.get(squareToCheck);
        if (pieceUnderAttack != null) {
          if (pieceUnderAttack.color === 'b') {
            piecesUnderAttack.push(`[${pieceUnderAttack.type} at ${squareToCheck}]`);
          }
        }
      }
      if (game.isAttacked(squareToCheck, BLACK)) {
        let pieceUnderAttack = game.get(squareToCheck);
        if (pieceUnderAttack != null) {
          if (pieceUnderAttack.color === 'w') {
            piecesYouCanAttack.push(`[${pieceUnderAttack.type} at ${squareToCheck}]`);
          }
        }
      }
    }
  }

  let pua = piecesUnderAttack.length == 0 ? "None" : piecesUnderAttack.join(', ');
  let pyca = piecesYouCanAttack.length == 0 ? "None" : piecesYouCanAttack.join(', ');

  let prompt_text = promptText.replace('{FEN}', FEN)
    .replace('{validMoves}', validMoves)
    .replace('{piecesUnderAttack}', pua)
    .replace('{piecesYouCanAttack}', pyca);
  //let prompt_text = `You are an AI assistant trained to suggest the next move in a game of chess. You are currently suggesting a move for the black pieces. The current board state in FEN (Forsyth-Edwards Notation) is \"${FEN}\". Your objective is to help achieve a winning position, while adhering to the rules of chess. The following pieces are currently under attack: ${}. Please provide your move in algebraic notation (e.g., "e2e4").\n\nYour suggested move is:`;

  if (invalidString != "")
    prompt_text += `\n\nYou previously chose: ${invalidString}\n\nThis move is invalid. You must choose a move from this list: [${validMoves}]`;

  const fenData = {
    "model": "gpt-3.5-turbo",
    "messages": [{ role: "system", content: `Here is the history of a chess game being played by a LLM. Using historic data, recommend a move: ${game.history()}` }]
  }
  const fenDescriptionOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(fenData)
  };
  let res;
  try {
    //Maybe I try to add something like this later?
    //let fenDescription = await fetch('https://api.chess.com/pub/position', fenDescriptionOptions);
    
    //Ask the AI to describe the board (note: it does a pretty bad job once the board gets complicated)
    //let fenDescription = await fetch('https://api.openai.com/v1/chat/completions', fenDescriptionOptions);
    /*if (fenDescription.ok) {
      let fenJsonResponse = await fenDescription.json();
      let fenRes = fenJsonResponse.choices[0].message.content.trim();
      prompt_text = prompt_text.replace('{fenExplanation}', fenRes);
    }*/

    const data = {
      "model": "gpt-3.5-turbo",
      "messages": [{ role: "system", content: prompt_text }]
    };
  
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(data)
    };

    console.log(prompt_text);

    let response = await fetch('https://api.openai.com/v1/chat/completions', options);
    if (!response.ok) {
      addMessageToChat("Fetch Error - Please try Refreshing", true);
    }
    let jsonResponse = await response.json();
    res = jsonResponse.choices[0].message.content.trim();
    let parts = res.split('Reasoning: ');
    let move = parts[0].trim();
    let reasoning = parts[1]?.trim() ?? "No Explanation Given";

    console.log("AI Response: " + res);
    move = move.replace(/\n/g, '');      // Remove newline characters
    move = move.replace(/['"]/g, '');    // Remove both single and double quotes
    move = move.replace(/\./g, '');      // Remove period
    move = move.replace(/\[/g, '');      // Remove opening square bracket
    move = move.replace(/\]/g, '');      // Remove closing square bracket
    var moveResult = null;
    try {
      moveResult = game.move(move);
    }
    catch (e) { }
    if (moveResult === null) {
      // Move was not legal, handle as appropriate for your application
      addMessageToChat(`Invalid move: ${move}. Retrying...`, true);
      await aiMove(move);
      return;
    } else {
      addMessageToChat(reasoning);
      board.position(game.fen());  // Update the board to the new position
    }
  }
  catch (e) {
    console.log("Invalid Response");
    await aiMove(res + " is invalid. Please try again.");
    return;
  }
}

// Function to check the status of the game
function checkGameStatus() {
  if (game.isCheckmate()) {
    alert('Checkmate');
    return;
  } else if (game.isDraw()) {
    let drawReason = '50-move rule';
    if (game.insufficient_material()) {
      drawReason = 'Insufficient material';
      return;
    } else if (game.isThreefoldRepetition()) {
      drawReason = 'Threefold repetition';
      return;
    } else if (game.isStalemate()) {
      drawReason = 'Stalemate';
      return;
    }
    alert(`Draw (${drawReason})`);
    return;
  }
  if (game.fen().split(" ")[1] === 'b') {
    addMessageToChat("Thinking...");
    aiMove();
  }
}

// Update board position after piece snap
function onSnapEnd() {
  board.position(game.fen());
}

// Configure board
var cfg = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};
board = Chessboard('board', cfg);