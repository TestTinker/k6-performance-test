// =========================================================
// WORKLOAD CONFIGURATION
// =========================================================


// =========================================================
// DEVELOPMENT
// =========================================================

export const developmentWorkload = {

    executor: 'ramping-vus',

    stages: [
        {
            duration: '5s',
            target: 1,
        },
        {
            duration: '5s',
            target: 1,
        },
        {
            duration: '5s',
            target: 0,
        },
    ],
};


// =========================================================
// SMALL
// =========================================================

export const smallWorkload = {

    executor: 'ramping-vus',

    stages: [
        {
            duration: '10s',
            target: 5,
        },
        {
            duration: '30s',
            target: 5,
        },
        {
            duration: '10s',
            target: 0,
        },
    ],
};


// =========================================================
// MEDIUM
// =========================================================

export const mediumWorkload = {

    executor: 'ramping-vus',

    stages: [
        {
            duration: '1m',
            target: 10,
        },
        {
            duration: '5m',
            target: 10,
        },
        {
            duration: '1m',
            target: 0,
        },
    ],
};


// =========================================================
// WORKLOAD MAP
// =========================================================
//
// Environment variable:
//
// -e WORKLOAD=development
// -e WORKLOAD=small
// -e WORKLOAD=medium
// =========================================================

export const workloads = {

    development:
        developmentWorkload,

    small:
        smallWorkload,

    medium:
        mediumWorkload,
};