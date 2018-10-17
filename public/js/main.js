function swap(){
    const burger = $(".hamburger");
    const links = $(".nav-item");
    const cont = $(".link-container");
    links.toggleClass("show");
    cont.toggleClass("down");
    burger.toggleClass("hang");

    const i = burger.find("i");
    i.toggleClass("fa-bars");
    i.toggleClass("fa-close");
}