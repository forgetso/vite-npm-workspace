
import {packageBfn} from '@myscope/b';
import {packageAfn} from "@myscope/a";

const main = async () => {
    packageAfn();
    packageBfn();
    console.log("aaaaadadaaaa")
    // sleep
    await new Promise((resolve) => setTimeout(resolve, 1000000000));
}

main().then(() => {
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
