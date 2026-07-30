(function () {
  const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes look-alikes (I,O,0,1)
  const captchaCodeEl = document.getElementById("captchaCode");
  const captchaInput = document.getElementById("captchaInput");
  const refreshBtn = document.getElementById("refreshCaptcha");
  const form = document.getElementById("loginForm");
  const formError = document.getElementById("formError");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");

  let currentCaptcha = "";

  function generateCaptcha(length = 6) {
    let code = "";
    for (let i = 0; i < length; i++) {
      code += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
    }
    return code;
  }

  function renderCaptcha() {
    currentCaptcha = generateCaptcha();
    captchaCodeEl.textContent = currentCaptcha;
    captchaInput.value = "";
    formError.textContent = "";
  }

  refreshBtn.addEventListener("click", renderCaptcha);

  togglePasswordBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePasswordBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.style.color = "";
    formError.textContent = "";

    const userId = document.getElementById("userId").value.trim();
    const password = passwordInput.value;
    const enteredCaptcha = captchaInput.value.trim();

    if (!userId || !password) {
      formError.textContent = "Please enter User ID and password.";
      return;
    }

    if (enteredCaptcha.toUpperCase() !== currentCaptcha.toUpperCase()) {
      formError.textContent = "Incorrect captcha. Please try again.";
      renderCaptcha();
      return;
    }

    const submitBtn = form.querySelector(".login-btn");
    submitBtn.disabled = true;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
        credentials: "same-origin",
      });
      const data = await response.json();

      if (data.success) {
        if (data.user.role === "superadmin") {
          window.location.href = "/admin/dashboard.html";
          return;
        }
        if (data.user.role === "hospital_admin") {
          window.location.href = "/hospital/dashboard.html";
          return;
        }
        if (data.user.role === "patient") {
          window.location.href = "/patient/dashboard.html";
          return;
        }
        window.location.href = "/staff/dashboard.html";
        return;
      } else {
        formError.textContent = data.message || "Invalid User ID or password.";
        renderCaptcha();
      }
    } catch (err) {
      formError.textContent = "Unable to reach the server. Please try again.";
    } finally {
      submitBtn.disabled = false;
    }
  });

  renderCaptcha();
})();
