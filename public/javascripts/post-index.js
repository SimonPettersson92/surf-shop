const clear = document.getElementById('clear-distance');
clear.addEventListener('click', (e) => {
       e.preventDefault();
       document.querySelector('#location').value = '';
       document.querySelector('input[type=radio]:checked').checked = false;
});