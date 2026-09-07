import {
    workloads,
} from './workloads.js';


// =========================================================
// SELECT WORKLOAD
// =========================================================
//
// Default:
// development
//
// Override:
//
// -e WORKLOAD=small
//
// or:
//
// -e WORKLOAD=medium
// =========================================================

const workloadName =
    __ENV.WORKLOAD ||
    'development';


const selectedWorkload =
    workloads[workloadName];


if (!selectedWorkload) {

    throw new Error(
        `Unknown workload '${workloadName}'. ` +
        `Available workloads: development, small, medium`
    );
}


// =========================================================
// K6 OPTIONS
// =========================================================

export const options = {

    scenarios: {

        new_case_load: {

            ...selectedWorkload,

            exec:
                'createNewCase',
        },
    },
};