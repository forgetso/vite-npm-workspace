import { packageAfn } from "@myscope/a";
const packageBfn = () => {
  window.alert("oi changed again");
};
const packageBAfn = () => {
  packageAfn();
};
export {
  packageBAfn,
  packageBfn
};
