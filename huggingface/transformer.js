
// let translator = null;
// let loadingPromise = null;

// // Load the model once and reuse it
// async function loadModel() {
//     if (!loadingPromise) {
//         const { pipeline } = await import('@xenova/transformers');
//         loadingPromise = pipeline('translation', 'Xenova/nllb-200-distilled-600M')
//             .then(model => {
//                 translator = model;
//                 console.log('Translation model loaded and ready to use!');
//             })
//             .catch(error => {
//                 console.error('Model loading failed:', error);
//                 translator = null;
//             });
//     }
//     return loadingPromise;
// }

// // Immediately start loading the model
// loadModel();

// /**
//  * Translates an English sentence (or multiple sentences) to Vietnamese.
//  * @param {string | string[]} inputText - A single string or an array of sentences to translate.
//  * @returns {Promise<string | string[]>} - The translated text(s).
//  */
// async function translateToVietnamese(inputText) {
//     if (!inputText || (typeof inputText !== 'string' && !Array.isArray(inputText))) {
//         throw new Error('Input must be a non-empty string or an array of strings.');
//     }

//     // Ensure the model is ready
//     if (!translator) {
//         await loadModel();
//         if (!translator) {
//             throw new Error('Translator model failed to load. Please try again later.');
//         }
//     }

//     try {
//         if (Array.isArray(inputText)) {
//             // Translate multiple sentences in parallel
//             const results = await Promise.all(
//                 inputText.map(sentence => translator(sentence, {
//                     src_lang: 'eng_Latn',
//                     tgt_lang: 'vie_Latn',
//                 }))
//             );
//             return results.map(res => res[0].translation_text);
//         } else {
//             // Translate a single sentence
//             const result = await translator(inputText, {
//                 src_lang: 'eng_Latn',
//                 tgt_lang: 'vie_Latn',
//             });
//             return result[0].translation_text;
//         }
//     } catch (error) {
//         console.error('Translation error:', error);
//         throw new Error('Translation failed due to an internal error.');
//     }
// }

// module.exports = { translateToVietnamese };