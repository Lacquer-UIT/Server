const express = require('express');
const router = express.Router();
const deckController = require('../controller/deck');
const authMiddleware = require('../middleware/auth'); // Updated to your actual middleware file
const { upload, handleUpload } = require('../middleware/upload');

// Base routes for decks
router.route('/')
  .get(authMiddleware, deckController.getAllDecks)
  .post(authMiddleware, upload.single('image'), handleUpload, deckController.createDeck);

router.route('/tag/:tagId')
  .get(authMiddleware, deckController.getDecksByTag);

router.route('/tag')
  .get(authMiddleware, deckController.getAllDecksSortedByTags);

router.route('/notag')
  .get(authMiddleware, deckController.getDecksWithoutTags);

router.route('/:id')
  .get(deckController.getDeckById)
  .put(authMiddleware, upload.single('image'), handleUpload, deckController.updateDeck)
  .delete(authMiddleware, deckController.deleteDeck);

// Card management within decks
router.route('/:id/cards')
  .post(authMiddleware, deckController.addCardToDeck);

router.route('/:id/cards/:cardId')
  .delete(authMiddleware, deckController.removeCardFromDeck);

module.exports = router;