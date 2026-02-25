// initialization

const RESPONSIVE_WIDTH = 1024

let headerWhiteBg = false
let isHeaderCollapsed = window.innerWidth < RESPONSIVE_WIDTH
const collapseBtn = document.getElementById("collapse-btn")
const collapseHeaderItems = document.getElementById("collapsed-header-items")



function onHeaderClickOutside(e) {

    if (!collapseHeaderItems.contains(e.target)) {
        toggleHeader()
    }

}


function toggleHeader() {
    if (isHeaderCollapsed) {
        // collapseHeaderItems.classList.remove("max-md:tw-opacity-0")
        collapseHeaderItems.classList.add("opacity-100",)
        collapseHeaderItems.style.width = "60vw"
        collapseBtn.classList.remove("bi-list")
        collapseBtn.classList.add("bi-x", "max-lg:tw-fixed")
        isHeaderCollapsed = false

        setTimeout(() => window.addEventListener("click", onHeaderClickOutside), 1)

    } else {
        collapseHeaderItems.classList.remove("opacity-100")
        collapseHeaderItems.style.width = "0vw"
        collapseBtn.classList.remove("bi-x", "max-lg:tw-fixed")
        collapseBtn.classList.add("bi-list")
        isHeaderCollapsed = true
        window.removeEventListener("click", onHeaderClickOutside)

    }
}

function responsive() {
    if (window.innerWidth > RESPONSIVE_WIDTH) {
        collapseHeaderItems.style.width = ""

    } else {
        isHeaderCollapsed = true
    }
}

window.addEventListener("resize", responsive)


/**
 * Animations
 */

gsap.registerPlugin(ScrollTrigger)

const heroTextEls = document.querySelectorAll(".reveal-hero-text")
const heroImgEls  = document.querySelectorAll(".reveal-hero-img")
const heroImgBg   = document.querySelector("#hero-img-bg")

if (heroTextEls.length) gsap.to(heroTextEls, { opacity: 0, y: "100%" })
if (heroImgEls.length)  gsap.to(heroImgEls,  { opacity: 0, y: "100%" })
if (heroImgBg)          gsap.to(heroImgBg,   { scale: 0 })

if (document.querySelector(".reveal-up")) {
    gsap.to(".reveal-up", { opacity: 0, y: "100%" })
}

window.addEventListener("load", () => {
    if (heroTextEls.length) {
        gsap.to(heroTextEls, {
            opacity: 1,
            y: "0%",
            duration: 0.8,
            stagger: 0.5,
        })
    }

    if (heroImgEls.length) {
        gsap.to(heroImgEls, { opacity: 1, y: "0%" })
    }

    if (heroImgBg) {
        gsap.to(heroImgBg, { scale: 1, duration: 0.8, delay: 0.4 })
    }
})


// ------------- reveal section animations ---------------

const sections = gsap.utils.toArray("section")

sections.forEach((sec) => {
    const revealUpEls = sec.querySelectorAll(".reveal-up")
    if (!revealUpEls.length) return

    const revealUptimeline = gsap.timeline({
        paused: true,
        scrollTrigger: {
            trigger: sec,
            start: "10% 80%",
            end: "20% 90%",
        }
    })

    revealUptimeline.to(revealUpEls, {
        opacity: 1,
        duration: 0.8,
        y: "0%",
        stagger: 0.2,
    })
})



