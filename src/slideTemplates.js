export const slideTemplates = {
    fullImage: {
        type: 'fullImage',
        name: 'Full Image',
        size: 'regular',
        mobileSize: 'regular',
        src: '',
        alt: '',
        backgroundColor: '#ffffff',
        useZoom: false,
        imagePosition: 'center center',
        imageScale: 1,
        imageTransform: {
            scale: 100,        // percentage (100 = original size)
            translateX: 0,     // pixels
            translateY: 0,     // pixels
            rotate: 0          // degrees
        },
        link: '',
        button: null
    },
    fullImageWithText: {
        type: 'fullImageWithText',
        name: 'Image with Text',
        size: 'regular',
        mobileSize: 'regular',
        src: '',
        alt: '',
        backgroundColor: '#ffffff',
        title: 'Your Title Here',
        text: 'Your text content here',
        textPosition: 'bottom',
        textWidth: '100%',
        titleColor: '#ffffff',
        textColor: '#ffffff',
        titleFontSize: 24,
        textFontSize: 14,
        useFillOverlay: false,
        fillColor: '#000000',
        fillHeight: '50%',
        fillDirection: 'bottom',
        useGradient: true,
        gradientColor: '#000000',
        gradientHeight: '50%',
        gradientDirection: 'bottom',
        useZoom: false,
        imagePosition: 'center center',
        imageScale: 1,
        imageTransform: {
            scale: 100,        // percentage (100 = original size)
            translateX: 0,     // pixels
            translateY: 0,     // pixels
            rotate: 0          // degrees
        },
        link: '',
        button: null
    },
    text: {
        type: 'text',
        name: 'Text Only',
        size: 'regular',
        mobileSize: 'regular',
        title: 'Your Title Here',
        text: 'Your text content here',
        backgroundColor: '#ffffff',
        titleColor: '#13264A',
        textColor: '#333333',
        titleFontSize: 22,
        textFontSize: 16,
        button: null
    },
    video: {
        type: 'video',
        name: 'Video',
        size: 'regular',
        mobileSize: 'regular',
        src: '',
        posterSrc: '',
        alt: 'Video',
        videoPosition: 'center center',
        videoScale: 1,
        button: null
    },
    fullVideoWithText: {
        type: 'fullVideoWithText',
        name: 'Video with Text',
        size: 'regular',
        mobileSize: 'regular',
        src: '',
        posterSrc: '',
        alt: 'Video',
        title: 'Your Title Here',
        text: 'Your text content here',
        textPosition: 'bottom',
        textWidth: '100%',
        textColor: '#ffffff',
        titleFontSize: 24,
        textFontSize: 14,
        useGradient: true,
        gradientColor: '#000000',
        gradientHeight: '50%',
        videoPosition: 'center center',
        videoScale: 1,
        button: null
    },
    bigNumber: {
        type: 'bigNumber',
        name: 'Big Numbers',
        size: 'regular',
        mobileSize: 'regular',
        numberOne: '85%',
        textOne: 'First statistic description',
        numberTwo: '42',
        textTwo: 'Second statistic description',
        backgroundColor: '#ffffff',
        numberColor: '#13264A',
        textColor: '#333333',
        numberFontSize: 40,
        textFontSize: 16,
        button: null
    },
    imageSelector: {
        type: 'imageSelector',
        name: 'Image Selector',
        size: 'regular',
        mobileSize: 'regular',
        backgroundColor: '#EFF2F7',
        imageWidth: '60%',
        textColor: '#333333',
        dotColor: '#cccccc',
        dotActiveColor: '#13264A',
        images: []
    }
};
