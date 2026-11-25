window.PIXEL_RUNNER_LEVELS = {
    jungle: {
        id: 'jungle',
        name: 'GIUNGLA',
        subtitle: 'FORESTA VIVA',
        biomeIndex: 0,
        durationSeconds: 75,
        speed: 2.4,
        firstCompletionReward: 500,
        replayReward: 100,
        events: [
            { at: 360, type: 'coins', count: 5, y: 112 },
            { at: 880, type: 'obstacle', width: 6, height: 8 },
            { at: 1480, type: 'pit', width: 22 },
            { at: 2070, type: 'coins', count: 6, y: 108 },
            { at: 2740, type: 'obstacle', width: 7, height: 13 },
            { at: 3350, type: 'wall' },
            { at: 4160, type: 'coins', count: 5, y: 120 },
            { at: 4780, type: 'pit', width: 24 },
            { at: 5480, type: 'obstacle', width: 7, height: 9, flying: true, y: 128 },
            { at: 6120, type: 'coins', count: 6, y: 106 },
            { at: 6840, type: 'wall' },
            { at: 7650, type: 'obstacle', width: 6, height: 14 },
            { at: 8280, type: 'pit', width: 22 },
            { at: 9010, type: 'coins', count: 6, y: 111 },
            { at: 9700, type: 'wall' },
            { at: 10550, type: 'obstacle', width: 7, height: 8 }
        ]
    },
    volcano: {
        id: 'volcano',
        name: 'VULCANO',
        subtitle: 'TERRE ARDENTI',
        biomeIndex: 1,
        durationSeconds: 75,
        speed: 2.7,
        firstCompletionReward: 500,
        replayReward: 100,
        events: [
            { at: 380, type: 'coins', count: 5, y: 112 },
            { at: 950, type: 'obstacle', width: 7, height: 9 },
            { at: 1620, type: 'coins', count: 6, y: 106 },
            { at: 2460, type: 'obstacle', width: 7, height: 14 },
            { at: 3420, type: 'wall' },
            { at: 4360, type: 'coins', count: 5, y: 118 },
            { at: 5350, type: 'pit', width: 24 },
            { at: 6270, type: 'obstacle', width: 8, height: 10 },
            { at: 7290, type: 'wall' },
            { at: 8300, type: 'coins', count: 6, y: 108 },
            { at: 9410, type: 'obstacle', width: 7, height: 14 },
            { at: 10450, type: 'wall' },
            { at: 11600, type: 'obstacle', width: 7, height: 9 }
        ]
    },
    glacier: {
        id: 'glacier',
        name: 'GHIACCIAIO',
        subtitle: 'CIME DI GHIACCIO',
        biomeIndex: 2,
        durationSeconds: 75,
        speed: 3,
        firstCompletionReward: 500,
        replayReward: 100,
        events: [
            { at: 420, type: 'coins', count: 5, y: 110 },
            { at: 1050, type: 'obstacle', width: 7, height: 10 },
            { at: 1810, type: 'pit', width: 24 },
            { at: 2690, type: 'coins', count: 6, y: 106 },
            { at: 3640, type: 'wall' },
            { at: 4650, type: 'obstacle', width: 7, height: 14 },
            { at: 5680, type: 'coins', count: 5, y: 118 },
            { at: 6760, type: 'pit', width: 26 },
            { at: 7790, type: 'wall' },
            { at: 8910, type: 'obstacle', width: 8, height: 10 },
            { at: 10050, type: 'coins', count: 6, y: 108 },
            { at: 11200, type: 'wall' },
            { at: 12380, type: 'obstacle', width: 7, height: 14 }
        ]
    },
    desert: {
        id: 'desert',
        name: 'DESERTO NEON',
        subtitle: 'DUNE AL NEON',
        biomeIndex: 3,
        durationSeconds: 75,
        speed: 3.3,
        firstCompletionReward: 500,
        replayReward: 100,
        events: [
            { at: 460, type: 'coins', count: 5, y: 112 },
            { at: 1120, type: 'obstacle', width: 7, height: 10 },
            { at: 1980, type: 'wall' },
            { at: 2920, type: 'coins', count: 6, y: 108 },
            { at: 3890, type: 'pit', width: 24 },
            { at: 4910, type: 'obstacle', width: 8, height: 14 },
            { at: 5960, type: 'wall' },
            { at: 7040, type: 'coins', count: 5, y: 118 },
            { at: 8130, type: 'obstacle', width: 8, height: 10 },
            { at: 9240, type: 'wall' },
            { at: 10380, type: 'pit', width: 26 },
            { at: 11550, type: 'coins', count: 6, y: 106 },
            { at: 12730, type: 'obstacle', width: 8, height: 14 },
            { at: 13900, type: 'wall' }
        ]
    }
};

window.PIXEL_RUNNER_LEVEL_ORDER = ['jungle', 'volcano', 'glacier', 'desert'];
