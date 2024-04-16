import { packageAfn } from '@myscope/a';

export const packageBfn = () => {
    console.log('packageBfn');
}

export const packageBAfn = () => {
    packageAfn();
}
