const fs = require("fs");
const file = "app.js";
let lines = fs.readFileSync(file, "utf8").split("\n");

const replacement = `    } else {
      container.innerHTML = \`
        <div class="section" style="max-width:550px; margin:4rem auto; padding:3rem 2rem; background-color:var(--white); border-radius:var(--border-radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-md);">
          <div id="tabs-header" style="display:flex; border-bottom:2px solid var(--border-color); margin-bottom:2rem;">
            <button id="tab-login" class="btn" style="flex:1; border-bottom:3px solid var(--primary-blue);">Login</button>
            <button id="tab-signup" class="btn" style="flex:1; border-bottom:none;">Register</button>
          </div>

          <div id="panel-login">
            <form id="form-login">
              <div class="form-group">
                <input type="email" class="form-control" id="login-email" placeholder="Email" required>
              </div>
              <div class="form-group">
                <input type="password" class="form-control" id="login-pwd" placeholder="Password" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;">Login</button>
              <div style="text-align:center; margin-top:1rem;">
                <a href="#" id="link-forgot-pwd" style="color:var(--primary-blue); font-size:0.9em; text-decoration:none;">Forgot Password?</a>
              </div>
            </form>
          </div>

          <div id="panel-signup" style="display:none;">
            <form id="form-signup">
              <div class="form-group">
                <input type="text" class="form-control" id="reg-company" placeholder="Company Name" required>
              </div>
              <div class="form-group">
                <input type="text" class="form-control" id="reg-name" placeholder="Contact Person Name" required>
              </div>
              <div class="form-group">
                <input type="text" class="form-control" id="reg-gst" placeholder="GSTIN Number (15-Digit)" pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" required>
              </div>
              <div class="form-group">
                <textarea class="form-control" id="reg-address" placeholder="Business Address" rows="2" required></textarea>
              </div>
              <div class="form-group">
                <input type="email" class="form-control" id="reg-email" placeholder="Email" required>
              </div>
              <div class="form-group">
                <input type="password" class="form-control" id="reg-pwd" placeholder="Password" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;">Continue</button>
            </form>
          </div>

          <div id="panel-reg-otp" style="display:none; text-align:center;">
             <h3>Verify Email</h3>
             <p>An OTP has been sent to your email.</p>
             <form id="form-reg-otp">
               <div class="form-group" style="margin-top:1rem;">
                 <input type="text" class="form-control" id="reg-otp" placeholder="Enter 6-digit OTP" required style="text-align:center; font-size:1.2rem; letter-spacing:2px;">
               </div>
               <button type="submit" class="btn btn-primary" style="width:100%;">Verify & Register</button>
               <button type="button" class="btn btn-outline" id="btn-back-reg" style="width:100%; margin-top:1rem;">Back</button>
             </form>
          </div>

          <div id="panel-forgot-pwd" style="display:none;">
             <h3 style="text-align:center;">Forgot Password</h3>
             <form id="form-forgot-pwd">
               <div class="form-group" style="margin-top:1rem;">
                 <input type="email" class="form-control" id="forgot-email" placeholder="Enter your registered email" required>
               </div>
               <button type="submit" class="btn btn-primary" style="width:100%;">Send Reset OTP</button>
               <button type="button" class="btn btn-outline" id="btn-back-login" style="width:100%; margin-top:1rem;">Back to Login</button>
             </form>
          </div>

          <div id="panel-reset-pwd" style="display:none;">
             <h3 style="text-align:center;">Reset Password</h3>
             <p style="text-align:center;">Enter the OTP sent to your email.</p>
             <form id="form-reset-pwd">
               <div class="form-group" style="margin-top:1rem;">
                 <input type="text" class="form-control" id="reset-otp" placeholder="Enter 6-digit OTP" required style="text-align:center; font-size:1.2rem; letter-spacing:2px;">
               </div>
               <div class="form-group">
                 <input type="password" class="form-control" id="reset-new-pwd" placeholder="New Password" required>
               </div>
               <button type="submit" class="btn btn-primary" style="width:100%;">Reset Password</button>
             </form>
          </div>
        </div>
      \`;

      const tabLogin = document.getElementById("tab-login");
      const tabSignup = document.getElementById("tab-signup");
      const panelLogin = document.getElementById("panel-login");
      const panelSignup = document.getElementById("panel-signup");
      const panelRegOtp = document.getElementById("panel-reg-otp");
      const panelForgotPwd = document.getElementById("panel-forgot-pwd");
      const panelResetPwd = document.getElementById("panel-reset-pwd");
      const tabsHeader = document.getElementById("tabs-header");
      
      let tempRegData = null;
      let resetEmail = null;

      const resetViews = () => {
        panelLogin.style.display = "none";
        panelSignup.style.display = "none";
        panelRegOtp.style.display = "none";
        panelForgotPwd.style.display = "none";
        panelResetPwd.style.display = "none";
        tabsHeader.style.display = "flex";
      };

      tabLogin?.addEventListener("click", () => {
        resetViews();
        tabLogin.style.borderBottom = "3px solid var(--primary-blue)";
        tabSignup.style.borderBottom = "none";
        panelLogin.style.display = "block";
      });

      tabSignup?.addEventListener("click", () => {
        resetViews();
        tabSignup.style.borderBottom = "3px solid var(--primary-blue)";
        tabLogin.style.borderBottom = "none";
        panelSignup.style.display = "block";
      });

      document.getElementById("link-forgot-pwd")?.addEventListener("click", (e) => {
        e.preventDefault();
        resetViews();
        tabsHeader.style.display = "none";
        panelForgotPwd.style.display = "block";
      });

      document.getElementById("btn-back-login")?.addEventListener("click", () => {
        tabLogin.click();
      });

      document.getElementById("btn-back-reg")?.addEventListener("click", () => {
        tabSignup.click();
      });

      // 1. Login Submit
      document.getElementById("form-login")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-pwd").value;

        try {
          const data = await apiCall("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
          });

          const normalizedUser = {
            ...data.user,
            companyName: data.user.companyName || data.user.company_name || "",
            contactPerson: data.user.contactPerson || data.user.company_name || email.split("@")[0],
          };

          localStorage.setItem("ci_token", data.token);
          localStorage.setItem("ci_user", JSON.stringify(normalizedUser));
          state.isLoggedIn = true;
          state.user = normalizedUser;
          saveState();
          showToast("Login successful", "success");
          window.location.hash = getRoleRoute(data.user?.role || normalizedUser.role);
        } catch (err) {
          showToast(err.message, "error");
        }
      });

      // 2. Register Submit (Send OTP)
      document.getElementById("form-signup")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        tempRegData = {
          company_name: document.getElementById("reg-company").value,
          full_name: document.getElementById("reg-name").value,
          gst_number: document.getElementById("reg-gst").value,
          address: document.getElementById("reg-address").value,
          email: document.getElementById("reg-email").value,
          password: document.getElementById("reg-pwd").value
        };

        try {
          await apiCall("/auth/send-register-otp", {
            method: "POST",
            body: JSON.stringify({ email: tempRegData.email })
          });
          
          showToast("OTP sent to your email", "success");
          resetViews();
          tabsHeader.style.display = "none";
          panelRegOtp.style.display = "block";
        } catch (err) {
          showToast(err.message, "error");
        }
      });

      // 3. Register Verify OTP
      document.getElementById("form-reg-otp")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const otp = document.getElementById("reg-otp").value;
        
        try {
          const data = await apiCall("/auth/register", {
            method: "POST",
            body: JSON.stringify({ ...tempRegData, otp })
          });

          const normalizedUser = {
            ...data.user,
            companyName: data.user.companyName || data.user.company_name || tempRegData.company_name,
            contactPerson: data.user.contactPerson || tempRegData.full_name,
          };

          localStorage.setItem("ci_token", data.token);
          localStorage.setItem("ci_user", JSON.stringify(normalizedUser));
          state.isLoggedIn = true;
          state.user = normalizedUser;
          saveState();
          showToast("Registration successful", "success");
          window.location.hash = getRoleRoute(data.user?.role || normalizedUser.role);
        } catch (err) {
          showToast(err.message, "error");
        }
      });

      // 4. Forgot Password Submit
      document.getElementById("form-forgot-pwd")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        resetEmail = document.getElementById("forgot-email").value;

        try {
          await apiCall("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email: resetEmail })
          });
          showToast("Password reset OTP sent to your email", "success");
          resetViews();
          tabsHeader.style.display = "none";
          panelResetPwd.style.display = "block";
        } catch (err) {
          showToast(err.message, "error");
        }
      });

      // 5. Reset Password Submit
      document.getElementById("form-reset-pwd")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const otp = document.getElementById("reset-otp").value;
        const newPassword = document.getElementById("reset-new-pwd").value;

        try {
          await apiCall("/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ email: resetEmail, otp, newPassword })
          });
          showToast("Password successfully reset! You can now login.", "success");
          tabLogin.click();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }`;

lines.splice(3788, 126, replacement); // 3788 is index for line 3789. Removing 126 lines up to 3914.
fs.writeFileSync(file, lines.join("\n"));
console.log("Safely replaced lines 3789-3914 in app.js");

