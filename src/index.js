/**
 * Copyright (c) 2024 Discover Financial Services
 */
import { subtract } from "./app";
function init() {
  var form = document.querySelector("form");
  form === null || form === void 0
    ? void 0
    : form.addEventListener("submit", submitHandler);
}
function submitHandler(e) {
  e.preventDefault();
  var num1 = document.querySelector("input[name='firstnumber']");
  var num2 = document.querySelector("input[name='secondnumber']");
  var result = subtract(Number(num1.value), Number(num2.value));
  var resultElement = document.querySelector("p");
  if (resultElement) {
    resultElement.textContent = result.toString();
  }
}
init();
