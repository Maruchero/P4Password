let activeUser = null;

/********************************************
 * DOM Elements
 */
// Sections
const dialogSection = document.getElementById("dialogs");
const loginSection = document.getElementById("login");
const passwordSection = document.getElementById("passwords");

// Outputs (for example: User added succesfully)
const loginOutput = document.getElementById("login-output");
const addUserOutput = document.getElementById("add-user-output");
const addPasswordOutput = document.getElementById("add-password-output");
const editPasswordOutput = document.getElementById("edit-password-output");
const deletePasswordOutput = document.getElementById("delete-password-output");

// Passwords Section Elements
const passwordContainer = document.getElementById("password-container");
const accountOutput = document.getElementById("account-output");
const usernameOutput = document.getElementById("username-output");
const passwordOutput = document.getElementById("password-output");

// Dialogs presetted fields
const editPasswordName = document.getElementById("edit-password-name-input");
const editPasswordUsername = document.getElementById(
  "edit-password-username-input"
);
const editPasswordPassword = document.getElementById(
  "edit-password-password-input"
);

const deletePasswordName = document.getElementById("delete-password-name");

/*****************************************
 * Load last user
 */
let lastUser = db.getUser(db.getLastUser().last_user);
if (lastUser) {
  const usernameInput = document.getElementById("username-input");
  const userImage = document.getElementById("user-image");
  // set username
  usernameInput.value = lastUser.username;
  // set the focus on the password field
  document.getElementById("password-input").focus();
  if (lastUser.image) {
    // set user image
    const imgPath = `${lastUser.image.replace(/\\/g, "/")}`;
    if (fs.exists(imgPath))
      userImage.style.backgroundImage = `url("/${imgPath}")`;
    // if user changes username reset the image
    usernameInput.addEventListener("input", () => {
      userImage.style = "";
    });
  }
}

/****************************************
 * Dialog functions
 */
function openDialog(id) {
  dialogSection.style.zIndex = "1000000";

  var dialog = document.getElementById(id);
  if (dialog) {
    dialog.classList.add("active");
    dialogSection.classList.add("active");
  }
}

function closeDialogs() {
  const dialogs = document.getElementsByTagName("dialog");
  for (var i = 0; i < dialogs.length; i++) {
    dialogs[i].classList.remove("active");
    dialogSection.classList.remove("active");
  }
  setTimeout(() => {
    dialogSection.style.zIndex = "initial";
  }, 300);
}

/******************************************
 * Add user dialog
 */
async function addUser() {
  const username = document.getElementById("add-user-username-input").value;
  const password = document.getElementById("add-user-password-input").value;
  const image = document.getElementById("add-user-image-input").value;
  const confirm = document.getElementById("add-user-confirm-input").value;

  if (username.length === 0) {
    addUserOutput.innerHTML = "Please enter a username";
    return;
  }
  if (password.length === 0) {
    addUserOutput.innerHTML = "Please enter a password";
    return;
  }
  if (password !== confirm) {
    addUserOutput.innerHTML = "Passwords do not match";
    return;
  }
  if (db.getUser(username)) {
    addUserOutput.innerHTML = "User already exists";
    return;
  }

  // Add user to the database
  try {
    db.addUser(username, await crypt.sha256(password), image ? image : null);
    addUserOutput.style.color = "var(--color-success)";
    addUserOutput.innerHTML = "User added sucesfully";
  } catch (error) {
    addUserOutput.innerHTML = "Something went wrong";
  }

  // Close the dialog
  setTimeout(() => {
    closeDialogs();
    setTimeout(() => {
      addUserOutput.style = "";
      addUserOutput.innerHTML = "";
      document.getElementById("add-user-username-input").value = "";
      document.getElementById("add-user-password-input").value = "";
      document.getElementById("add-user-confirm-input").value = "";
    }, 300);
  }, 1000);
}

async function showOpenDialog(element) {
  const path = await dialog.chooseImage();
  document.getElementById("add-user-image-input").value = path;
  element.backgroundColor = "var(--color-success)";
}

/******************************************
 * Login section
 */
async function login() {
  const username = document.getElementById("username-input").value;
  const password = document.getElementById("password-input").value;

  if (username.length === 0) {
    loginOutput.innerHTML = "Please enter a username";
    return;
  }
  if (password.length === 0) {
    loginOutput.innerHTML = "Please enter a password";
    return;
  }

  // Check if user exists
  const user = db.getUser(username);
  if (!user || user.password !== (await crypt.sha256(password))) {
    loginOutput.innerHTML = "Invalid username or password";
    return;
  }

  // Load passwords
  db.setLastUser(username);
  crypt.generateKey(password).then(() => {
    loadPasswords(username);

    // Login user
    activeUser = username;
    loginOutput.style.color = "var(--color-success)";
    loginOutput.innerHTML = "Login successful";

    passwordSection.style = "left: 0; display: block;";
    loginSection.style = "opacity: .5";

    setTimeout(() => {
      loginOutput.style = "";
    }, 500);
  });
}

/****************************************
 * Password section
 */
function generatePassword() {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#!$%&/()*+-_:;";
  let password = "";
  for (var i = 0; i < 16; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  // copy password to clipboard
  copyToClipboard(password);
  return password;
}

const passwordSpans = [];
let activeSpan = null;
async function loadPasswords(user) {
  // Clear previous status
  activeSpan = null;
  accountOutput.value = "";
  usernameOutput.value = "";
  passwordOutput.value = "";
  editPasswordName.value = "";
  editPasswordUsername.value = "";
  editPasswordPassword.value = "";
  deletePasswordName.innerHTML = "";
  passwordContainer.innerHTML = "";

  // Set focus on searchbar
  console.log(d = document.querySelector("input[type='search']"));
  //document.querySelector("input[type='search']").focus();

  // Load passwords
  const passwords = db.getPasswords(user);

  for (let i = 0; i < passwords.length; i++) {
    const password = passwords[i];
    const span = document.createElement("span");
    span.classList.add("password");
    span.innerHTML = await crypt.decrypt(password.name);

    span.addEventListener("click", async () => {
      // Highlight span
      span.classList.add("active");
      if (!activeSpan) {
        // activate edit and delete buttons
        const buttonBar = passwordSection.querySelector(".button-bar");
        for (let i = 0; i < buttonBar.children.length; i++) {
          buttonBar.children[i].removeAttribute("disabled");
        }
        activeSpan = span;
      } else if (activeSpan !== span) {
        // if clicked a different span remove highlighting from the previous
        activeSpan.classList.remove("active");
      }
      activeSpan = span;
      activeSpan.dataset.id = password.id;
      // Decrypt password
      const decrypted = {};
      decrypted.name = await crypt.decrypt(password.name);
      decrypted.username = await crypt.decrypt(password.username);
      decrypted.password = await crypt.decrypt(password.password);
      // Show password
      accountOutput.value = decrypted.name;
      usernameOutput.value = decrypted.username;
      passwordOutput.value = decrypted.password;
      // Preset all dialogs
      editPasswordName.value = decrypted.name;
      editPasswordUsername.value = decrypted.username;
      editPasswordPassword.value = decrypted.password;
      deletePasswordName.innerHTML = decrypted.name;
    });
    passwordContainer.appendChild(span);
    passwordSpans.push(span);
  }
}

function search(keyword) {
  for (let i = 0; i < passwordSpans.length; i++) {
    const span = passwordSpans[i];
    if (span.innerHTML.toLowerCase().includes(keyword.toLowerCase())) {
      span.style.display = "block";
    } else {
      span.style.display = "none";
    }
  }
}

function logOut() {
  location.reload();
}

/******************************************
 * CRUD dialogs
 */
async function addPassword() {
  const name = document.getElementById("add-password-name-input").value;
  const username = document.getElementById("add-password-username-input").value;
  const password = document.getElementById("add-password-password-input").value;

  if (name.length === 0) {
    addPasswordOutput.innerHTML = "Please enter a name";
    return;
  }
  if (username.length === 0) {
    addPasswordOutput.innerHTML = "Please enter a username";
    return;
  }
  if (password.length === 0) {
    addPasswordOutput.innerHTML = "Please enter a password";
    return;
  }

  // Add password to the database
  try {
    db.addPassword(
      activeUser,
      await crypt.encrypt(name),
      await crypt.encrypt(username),
      await crypt.encrypt(password)
    );
    addPasswordOutput.style.color = "var(--color-success)";
    addPasswordOutput.innerHTML = "Password added sucesfully";
  } catch (error) {
    console.error(error);
    addPasswordOutput.innerHTML = "Something went wrong";
  }

  // Close the dialog
  setTimeout(() => {
    closeDialogs();
    setTimeout(() => {
      addPasswordOutput.style = "";
      addPasswordOutput.innerHTML = "";
      document.getElementById("add-password-name-input").value = "";
      document.getElementById("add-password-username-input").value = "";
      document.getElementById("add-password-password-input").value = "";
      // deactivate edit and delete buttons
      const editButton = passwordSection.querySelector(
        ".button-bar button[title='Edit']"
      );
      const deleteButton = passwordSection.querySelector(
        ".button-bar button[title='Delete']"
      );
      editButton.setAttribute("disabled", "disabled");
      deleteButton.setAttribute("disabled", "disabled");
      // reload passwords
      loadPasswords(activeUser);
    }, 300);
  }, 1000);
}

async function editPassword() {
  const name = editPasswordName.value;
  const username = editPasswordUsername.value;
  const password = editPasswordPassword.value;

  if (name.length === 0) {
    editPasswordOutput.innerHTML = "Please enter a name";
    return;
  }
  if (username.length === 0) {
    editPasswordOutput.innerHTML = "Please enter a username";
    return;
  }
  if (password.length === 0) {
    editPasswordOutput.innerHTML = "Please enter a password";
    return;
  }

  // Edit password in the database
  try {
    db.updatePassword(
      activeSpan.dataset.id,
      activeUser,
      await crypt.encrypt(name),
      await crypt.encrypt(username),
      await crypt.encrypt(password)
    );
    editPasswordOutput.style.color = "var(--color-success)";
    editPasswordOutput.innerHTML = "Password edited sucesfully";
  } catch (error) {
    console.error(error);
    editPasswordOutput.innerHTML = "Something went wrong";
  }

  // Close the dialog
  setTimeout(() => {
    closeDialogs();
    setTimeout(() => {
      editPasswordOutput.style = "";
      editPasswordOutput.innerHTML = "";
      document.getElementById("edit-password-name-input").value = "";
      document.getElementById("edit-password-username-input").value = "";
      document.getElementById("edit-password-password-input").value = "";
      // deactivate edit and delete buttons
      const editButton = passwordSection.querySelector(
        ".button-bar button[title='Edit']"
      );
      const deleteButton = passwordSection.querySelector(
        ".button-bar button[title='Delete']"
      );
      editButton.setAttribute("disabled", "disabled");
      deleteButton.setAttribute("disabled", "disabled");
      // reload passwords
      loadPasswords(activeUser);
    }, 300);
  }, 1000);
}

async function deletePassword() {
  // Delete password from the database
  try {
    db.deletePassword(
      activeSpan.dataset.id,
      activeUser,
      await crypt.encrypt(accountOutput.value),
      await crypt.encrypt(usernameOutput.value),
      await crypt.encrypt(passwordOutput.value)
    );
    deletePasswordOutput.style.color = "var(--color-success)";
    deletePasswordOutput.innerHTML = "Password deleted sucesfully";
  } catch (error) {
    console.error(error);
    deletePasswordOutput.innerHTML = "Something went wrong";
  }

  // Close the dialog
  setTimeout(() => {
    closeDialogs();
    setTimeout(() => {
      deletePasswordOutput.style = "";
      deletePasswordOutput.innerHTML = "";
      deletePasswordName.innerHTML = "";
      // deactivate edit and delete buttons
      const editButton = passwordSection.querySelector(
        ".button-bar button[title='Edit']"
      );
      const deleteButton = passwordSection.querySelector(
        ".button-bar button[title='Delete']"
      );
      editButton.setAttribute("disabled", "disabled");
      deleteButton.setAttribute("disabled", "disabled");
      // reload passwords
      loadPasswords(activeUser);
    }, 300);
  }, 1000);
}
