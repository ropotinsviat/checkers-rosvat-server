class Validator {
  checkName(name) {
    if (typeof name !== "string") throw new Error("Missing name");
    if (name.length < 5) throw new Error("Name too short");
    if (name.length > 30) throw new Error("Name too long");
  }

  checkPassword(password) {
    if (typeof password !== "string")
      throw new Error("Password should be a string");
    if (password.length > 30) throw new Error("Password too long");
  }

  checkTimeLimit(timeLimit) {
    if (typeof timeLimit !== "number" || timeLimit < 60 || timeLimit > 6000)
      throw new Error("Incorrect time limit");
  }
}

const validator = new Validator();
export default validator;
