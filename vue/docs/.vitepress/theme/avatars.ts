/**
 * Testimonial avatars cached under `public/testimonials`, keyed by their original
 * X URL. A quote without a local copy keeps the remote image as its source.
 */
export const AVATAR_CACHE: Record<string, string> = {
  'https://pbs.twimg.com/profile_images/1381626879506063372/3bGEVIBi_normal.jpg': '/testimonials/3bGEVIBi_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2061383930922803200/djUhafPA_normal.jpg': '/testimonials/djUhafPA_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2111959327263039488/FEgh-aOr_normal.jpg': '/testimonials/FEgh-aOr_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2105652830690492416/jTqtySNn_normal.jpg': '/testimonials/jTqtySNn_bigger.jpg',
  'https://pbs.twimg.com/profile_images/1891533502811865088/TGLd-ENY_normal.jpg': '/testimonials/TGLd-ENY_bigger.jpg',
  'https://pbs.twimg.com/profile_images/1729658981948297216/Wak7qnpl_normal.jpg': '/testimonials/Wak7qnpl_bigger.jpg',
  'https://pbs.twimg.com/profile_images/1932115467625250816/GoMqArnP_normal.jpg': '/testimonials/GoMqArnP_bigger.jpg',
  'https://pbs.twimg.com/profile_images/1995066913173708800/DXdpccI__normal.jpg': '/testimonials/DXdpccI__bigger.jpg',
  'https://pbs.twimg.com/profile_images/2096917878301757441/DP7Gx7a7_normal.jpg': '/testimonials/DP7Gx7a7_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2044050048720195584/2igILgnd_normal.jpg': '/testimonials/2igILgnd_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2055977544445509632/J4stXtey_normal.jpg': '/testimonials/J4stXtey_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2001649168801009664/MTKkbyC6_normal.jpg': '/testimonials/MTKkbyC6_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2024929770715447300/6_d0j4NL_normal.jpg': '/testimonials/6_d0j4NL_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2073764792356212736/0Ueie-5y_200x200.jpg': '/testimonials/0Ueie-5y_200x200.jpg',
  'https://pbs.twimg.com/profile_images/1658144277288095744/2VpFVWpR_200x200.jpg': '/testimonials/2VpFVWpR_200x200.jpg',
  'https://pbs.twimg.com/profile_images/2037069613461372928/pZVqHmPg_normal.jpg': '/testimonials/pZVqHmPg_bigger.jpg',
  'https://pbs.twimg.com/profile_images/1998948097662259200/PfaIVhfU_normal.jpg': '/testimonials/PfaIVhfU_bigger.jpg',
  'https://pbs.twimg.com/profile_images/1865446187295178752/thuJzCdX_normal.jpg': '/testimonials/thuJzCdX_bigger.jpg',
  'https://pbs.twimg.com/profile_images/1837376254607077376/k9hrX4mP_normal.jpg': '/testimonials/k9hrX4mP_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2016098268883910657/U5EKdUq5_normal.jpg': '/testimonials/U5EKdUq5_bigger.jpg',
  'https://pbs.twimg.com/profile_images/1793338348398071808/-SrMDjm9_normal.jpg': '/testimonials/-SrMDjm9_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2054257567350607872/Mt6Fhivs_normal.jpg': '/testimonials/Mt6Fhivs_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2047053248427638784/lY1d_G02_normal.jpg': '/testimonials/lY1d_G02_bigger.jpg',
  'https://pbs.twimg.com/profile_images/1911752944212406272/t6lZLeFg_normal.jpg': '/testimonials/t6lZLeFg_bigger.jpg',
  'https://pbs.twimg.com/profile_images/1620798411338547200/AAlPAkWT_normal.jpg': '/testimonials/AAlPAkWT_bigger.jpg',
  'https://pbs.twimg.com/profile_images/2001436282224795648/YFxqfgJB_normal.jpg': '/testimonials/YFxqfgJB_bigger.jpg',
}

export function avatarSrc(avatar: string) {
  return AVATAR_CACHE[avatar] ?? avatar.replace('_normal', '_bigger')
}
