var styleCache = {'-': [0xcc, 0xcc, 0xcc]};

function getCssBackgroundColor(content) {
    var color = getRandomBackgroundColor(content);
    return 'rgb(' + color.join(',') + ')';
}

function getRandomBackgroundColor(content) {
    if (content === '' || content === null || content === undefined) {
        return styleCache['-'];
    }
    if (content[0] in styleCache) {
        return styleCache[content[0]];
    }
    
    //define as HSL with a high lightness to ensure enough contrast with black text
    var hue = Math.floor(Math.random()*360); // range 0-359
    var saturation = 1; // range 0-1
    var lightness = 0.75; // range 0-1

    //convert to RGB
    var chroma = (1 - Math.abs(2*lightness-1))*saturation;
    var x = chroma*(1 - Math.abs(hue/60 % 2 - 1));
    var result;
    switch(Math.floor(hue/60)) {
    case 0:
        result = [chroma, x, 0];
        break;
    case 1:
        result = [x, chroma, 0];
        break;
    case 2:
        result = [0, chroma, x];
        break;
    case 3:
        result = [0, x, chroma];
        break;
    case 4:
        result = [x, 0, chroma];
        break;
    case 5:
        result = [chroma, 0, x];
        break;
    default:
        result = [1,1,1];
    }
        
    var m = lightness - chroma*0.5;
    result = result.map(function(v) {
        return Math.floor((v+m)*256);
    });
    styleCache[content[0]] = result;
    return result;
}
