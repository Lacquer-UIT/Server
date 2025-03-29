const express = require('express');
const router = express.Router();
const deckController = require('../controller/deck');
const authMiddleware = require('../middleware/auth'); // Updated to your actual middleware file

// Base routes for decks
router.route('/')
  .get(authMiddleware,deckController.getAllDecks)
  .post(authMiddleware, deckController.createDeck);

router.route('/:id')
  .get(deckController.getDeckById)
  .put(authMiddleware, deckController.updateDeck)
  .delete(authMiddleware, deckController.deleteDeck);

// Card management within decks
router.route('/:id/cards')
  .post(authMiddleware, deckController.addCardToDeck);

router.route('/:id/cards/:cardId')
  .delete(authMiddleware, deckController.removeCardFromDeck);

module.exports = router;