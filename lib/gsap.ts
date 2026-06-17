"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

let registered = false;

export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);
  // The single ease the whole site breathes on — an expo-like rack-focus curve.
  if (!CustomEase.get("rack")) {
    CustomEase.create("rack", "0.16, 1, 0.3, 1");
  }
  registered = true;
}

export { gsap, ScrollTrigger, SplitText, CustomEase, useGSAP };
