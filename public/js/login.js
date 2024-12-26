// public/js/login.js
document.querySelector("form").addEventListener("submit", function (event) {
    const email = document.querySelector("input[name='email']").value;
    const password = document.querySelector("input[name='password']").value;

    // Basic client-side validation (not critical, as validation should also be done server-side)
    if (!email || !password) {
        alert("Please fill in both the email and password fields.");
        event.preventDefault(); // Prevent form submission if validation fails
        return;
    }

    // You can also add any other visual enhancements, like showing a loading spinner, if needed.
    // Example: Show a simple loading message
    const button = document.querySelector("button");
    button.disabled = true;
    button.innerHTML = "Logging in...";

    // If you want to make the login smoother, you can add a request to the server (AJAX), but the current form submits it directly.
    // For example, here's how you could add AJAX (with fetch) to prevent a full-page reload:

    /*
    event.preventDefault();  // Prevent the form from submitting normally

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.text())
    .then(data => {
        if (data === "Login successful") {
            window.location.href = "/dashboard";  // Redirect to a dashboard or another page
        } else {
            alert(data);  // Show error message
        }
    })
    .catch(error => {
        console.error('Error:', error);
    })
    .finally(() => {
        button.disabled = false;
        button.innerHTML = "Login";  // Reset the button text
    });
    */
});
