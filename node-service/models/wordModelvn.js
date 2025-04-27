const mongoose = require("mongoose");
const { Schema } = mongoose;

// Example schema
const ExampleSchema = new Schema({
  phrase: String,
  translation: String,
});

// Definition schema
const DefinitionSchema = new Schema({
  text: { type: String, required: true },
  examples: { type: [ExampleSchema], default: [] },
});

// Meaning schema
const MeaningSchema = new Schema({
  part_of_speech: {
    type: { type: String, required: true },
  },
  definitions: { type: [DefinitionSchema], required: true },
});

// Main dictionary schema
const DictionaryEntrySchema = new Schema(
  {
    word: { type: String, required: true, index: true },
    pronunciations: { type: [String], default: [] },
    img:{type:[String], default: []},
    meanings: { type: [MeaningSchema], required: true },
  },
  { collection: "Vie-Eng" }
);

const Dictionary = mongoose.model("DictionaryVn", DictionaryEntrySchema);
module.exports = Dictionary;