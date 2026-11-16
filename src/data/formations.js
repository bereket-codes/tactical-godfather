export const formations = {
  "4-3-3": {
    name: "4-3-3",
    strengths: [
      "Excellent width in attack",
      "Midfield triangle allows for easy passing angles",
      "High press is naturally supported"
    ],
    weaknesses: [
      "Single pivot (CDM) can be overloaded centrally",
      "Fullbacks leave space behind when attacking"
    ],
    slots: [
      { id: "GK", position: "GK", top: "90%", left: "50%" },
      { id: "LB", position: "LB", top: "70%", left: "15%" },
      { id: "CB1", position: "CB", top: "75%", left: "35%" },
      { id: "CB2", position: "CB", top: "75%", left: "65%" },
      { id: "RB", position: "RB", top: "70%", left: "85%" },
      { id: "CDM", position: "CDM", top: "50%", left: "50%" },
      { id: "CM1", position: "CM", top: "40%", left: "30%" },
      { id: "CM2", position: "CM", top: "40%", left: "70%" },
      { id: "LW", position: "LW", top: "20%", left: "20%" },
      { id: "ST", position: "ST", top: "10%", left: "50%" },
      { id: "RW", position: "RW", top: "20%", left: "80%" }
    ]
  },
  "4-2-3-1": {
    name: "4-2-3-1",
    strengths: [
      "Double pivot protects the defense",
      "Great for controlling the central space",
      "CAM can exploit the half-spaces"
    ],
    weaknesses: [
      "Lone striker can be isolated",
      "Requires high stamina from fullbacks"
    ],
    slots: [
      { id: "GK", position: "GK", top: "90%", left: "50%" },
      { id: "LB", position: "LB", top: "70%", left: "15%" },
      { id: "CB1", position: "CB", top: "75%", left: "35%" },
      { id: "CB2", position: "CB", top: "75%", left: "65%" },
      { id: "RB", position: "RB", top: "70%", left: "85%" },
      { id: "CDM1", position: "CDM", top: "55%", left: "35%" },
      { id: "CDM2", position: "CDM", top: "55%", left: "65%" },
      { id: "LM", position: "LM", top: "35%", left: "15%" },
      { id: "CAM", position: "CAM", top: "35%", left: "50%" },
      { id: "RM", position: "RM", top: "35%", left: "85%" },
      { id: "ST", position: "ST", top: "10%", left: "50%" }
    ]
  }
};