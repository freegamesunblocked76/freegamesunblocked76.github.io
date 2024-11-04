window.GAME_ID = 'colorup';
window.GAME_STORAGE_PREFIX = 'colorup:';
window.GAME_VERSION = 'v1.0.0d';

if (window.PokiSDK && !new URLSearchParams(window.location.search).get('noPoki') ) {

    PokiSDK.init().then(() => {
        console.log("Poki SDK successfully initialized");
        // fire your function to continue to game
    }).catch(() => {
        console.log("Initialized, but the user likely has adblock");
        // fire your function to continue to game
    });
}