export const getRandomId = (num = 11) => {
  let returnStr = '',
    charStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < num; i++) {
    let index = Math.round(Math.random() * (charStr.length - 1));
    returnStr += charStr.substring(index, index + 1);
  }
  return returnStr;
};

export const createElement = (
  tag = 'div',
  className?: string | string[],
  innerHTML?: string,
) => {
  const domNode = document.createElement(tag);
  if (className && typeof className === 'string') {
    className = [className];
  }
  className && domNode.classList.add(...className);
  innerHTML && (domNode.innerHTML = innerHTML);
  return domNode;
};
