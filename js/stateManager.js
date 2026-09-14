export function savePageState(key, data){
  try{

    if(!key){
      return;
    }

    sessionStorage.setItem(
      `state:${key}`,
      JSON.stringify(data)
    );

  } catch(e){

    console.warn(
      "State save failed",
      e
    );

  }
}

export function loadPageState(key){
  try{

    if(!key){
      return null;
    }

    const raw =
    sessionStorage.getItem(
      `state:${key}`
    );

    return raw
      ? JSON.parse(raw)
      : null;

  } catch(e){

    console.warn(
      "State load failed",
      e
    );

    return null;

  }
}

export function clearPageState(key){

  if(!key){
    return;
  }

  sessionStorage.removeItem(
    `state:${key}`
  );

}