import { Chess, WHITE, BLACK } from "./chess.js";

// Initialize new game and board
let game = new Chess();
var board = Chessboard('board', 'start');

// Function to handle piece movement
function onDragStart (source, piece, position, orientation) {
  // Do not pick up pieces if the game is over or it's not that side's turn
  if (game.isGameOver() || (game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
  if(document.getElementById('api-key').value === "") {
	alert('Please enter a valid API Key');
    return false;
  }
}

// Function to check if a move is legal
function onDrop (source, target) {
  // See if the move is legal
  try {
    var move = game.move({
      from: source,
      to: target,
      promotion: 'q' // Always promote to a queen for simplicity's sake
    });
  }
  catch(e) {}

  // If illegal move, snap back
  if (move === null) return 'snapback';

  // If legal move, check game status
  checkGameStatus();
}

async function aiMove(invalidString = "") {
  const FEN = game.fen();
  const validMoves = game.moves().join(", ");
  const apiKey = document.getElementById('api-key').value;
  let promptText = document.getElementById('prompt-text').value;
  const squares = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const allPieces = ['1', '2', '3', '4', '5', '6', '7', '8'];
  let piecesUnderAttack = [];
  let piecesYouCanAttack = [];
  
  for(let piece of allPieces){
    for(let square of squares){
      let squareToCheck = square + piece;
        if(game.isAttacked(squareToCheck, WHITE)){
		  let pieceUnderAttack = game.get(squareToCheck);
		  if(pieceUnderAttack != null) {
			if(pieceUnderAttack.color === 'b') {
				piecesUnderAttack.push(`[${pieceUnderAttack.type} at ${squareToCheck}]`);
			}
		  }
        }
		if(game.isAttacked(squareToCheck, BLACK)){
		  let pieceUnderAttack = game.get(squareToCheck);
		  if(pieceUnderAttack != null) {
			if(pieceUnderAttack.color === 'w') {
				piecesYouCanAttack.push(`[${pieceUnderAttack.type} at ${squareToCheck}]`);
			}
		  }
		}
    }
  }

  let prompt_text = promptText.replace('{FEN}', FEN)
                              .replace('{validMoves}',validMoves)
                              .replace('{piecesUnderAttack}',piecesUnderAttack.length == 0 ? "None" : piecesUnderAttack.join(', '))
							  .replace('{piecesYouCanAttack}',piecesYouCanAttack.length == 0 ? "None" : piecesYouCanAttack.join(', '));
  //let prompt_text = `You are an AI assistant trained to suggest the next move in a game of chess. You are currently suggesting a move for the black pieces. The current board state in FEN (Forsyth-Edwards Notation) is \"${FEN}\". Your objective is to help achieve a winning position, while adhering to the rules of chess. The following pieces are currently under attack: ${}. Please provide your move in algebraic notation (e.g., "e2e4").\n\nYour suggested move is:`;
  
  if(invalidString != "")
    prompt_text += `\n\n${invalidString}\n\nThe previous move attempt was invalid due to no piece being present at the specified start square or the move was not legal. Please suggest a new move:`;

  document.getElementById('ai-thoughts').textContent = "Thinking...";
  console.log(prompt_text);
  
  const data = {
    "model": "gpt-3.5-turbo",
    "messages": [{role: "system", content: prompt_text}]
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(data)
  };

  try {
	const response = await fetch('https://api.openai.com/v1/chat/completions', options);
    const jsonResponse = await response.json();
    let res = jsonResponse.choices[0].message.content.trim();
	document.getElementById('ai-thoughts').textContent = "Parsing response... " + res;
    let parts = res.split('Reasoning: ');
    let move = parts[0].trim();
	let reasoning = parts[1]?.trim() ?? "No Explanation Given";
	
    console.log("AI Response: " + move);
    move = move.replace(/\n/g, '');  // Remove newline characters
    move = move.replace(/['"]/g, '');  // Remove both single and double quotes
    move = move.replace(/\./g, '');  // Remove period
    var moveResult = null;
    try {
      moveResult = game.move(move);
    }
    catch(e) {}
    if (moveResult === null) {
      // Move was not legal, handle as appropriate for your application
      document.getElementById('ai-thoughts').textContent = `Invalid move: ${move}. Retrying...`;
	  aiMove(move);
	  return;
    } else {
      document.getElementById('ai-thoughts').textContent = "AI Thoughts: " + reasoning;
      board.position(game.fen());  // Update the board to the new position
    }
  }
  catch(e) {
    console.log("Invalid Response");
	aiMove(res + " is invalid. Please try again.");
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
  if(game.fen().split(" ")[1] === 'b')
	aiMove();
}

// Update board position after piece snap
function onSnapEnd () {
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