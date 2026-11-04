const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./rider-model-DOt_eWSR.js","./GLTFLoader-ZQPYWCkq.js","./rider-board-B9ChWtH_.js"])))=>i.map(i=>d[i]);
import{$ as e,$n as t,A as n,At as r,B as i,Bn as a,Ct as o,D as s,E as c,En as l,Fn as u,G as d,Gn as f,H as p,Hn as m,I as h,In as g,Jn as _,K as v,Kn as y,L as b,M as x,Mn as S,N as C,Nn as w,O as T,On as E,Pn as D,Q as O,Qn as ee,R as te,Rn as ne,S as k,Sn as A,T as j,Tt as re,Un as ie,Vn as ae,W as M,Wn as N,X as oe,Xn as P,Y as se,Yn as ce,Z as le,Zn as ue,_ as de,_t as F,ar as I,at as L,b as R,bn as fe,bt as z,c as pe,cn as me,ct as he,d as B,dt as ge,er as _e,et as ve,f as V,fn as ye,ft as be,g as xe,gt as Se,h as Ce,ht as we,i as H,ir as Te,it as U,j as Ee,jn as De,k as Oe,kn as ke,kt as Ae,lt as je,mn as Me,mt as W,nr as Ne,nt as Pe,on as Fe,or as Ie,ot as Le,p as G,pn as Re,pt as K,q,qn as ze,r as Be,rr as Ve,sn as He,st as J,t as Ue,tr as We,tt as Ge,ut as Ke,v as qe,vt as Je,w as Ye,x as Y,xn as Xe,xt as Ze,yn as Qe,yt as $e,z as et}from"./GLTFLoader-ZQPYWCkq.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function tt(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function nt(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var X={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},Z={common:{diffuse:{value:new R(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new L},alphaMap:{value:null},alphaMapTransform:{value:new L},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new L}},envmap:{envMap:{value:null},envMapRotation:{value:new L},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new L}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new L}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new L},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new L},normalScale:{value:new N(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new L},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new L}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new L}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new L}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new R(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new f},probesMax:{value:new f},probesResolution:{value:new f}},points:{diffuse:{value:new R(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new L},alphaTest:{value:0},uvTransform:{value:new L}},sprite:{diffuse:{value:new R(16777215)},opacity:{value:1},center:{value:new N(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new L},alphaMap:{value:null},alphaMapTransform:{value:new L},alphaTest:{value:0}}},rt={basic:{uniforms:Ve([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.fog]),vertexShader:X.meshbasic_vert,fragmentShader:X.meshbasic_frag},lambert:{uniforms:Ve([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,Z.lights,{emissive:{value:new R(0)},envMapIntensity:{value:1}}]),vertexShader:X.meshlambert_vert,fragmentShader:X.meshlambert_frag},phong:{uniforms:Ve([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,Z.lights,{emissive:{value:new R(0)},specular:{value:new R(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:X.meshphong_vert,fragmentShader:X.meshphong_frag},standard:{uniforms:Ve([Z.common,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.roughnessmap,Z.metalnessmap,Z.fog,Z.lights,{emissive:{value:new R(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:X.meshphysical_vert,fragmentShader:X.meshphysical_frag},toon:{uniforms:Ve([Z.common,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.gradientmap,Z.fog,Z.lights,{emissive:{value:new R(0)}}]),vertexShader:X.meshtoon_vert,fragmentShader:X.meshtoon_frag},matcap:{uniforms:Ve([Z.common,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,{matcap:{value:null}}]),vertexShader:X.meshmatcap_vert,fragmentShader:X.meshmatcap_frag},points:{uniforms:Ve([Z.points,Z.fog]),vertexShader:X.points_vert,fragmentShader:X.points_frag},dashed:{uniforms:Ve([Z.common,Z.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:X.linedashed_vert,fragmentShader:X.linedashed_frag},depth:{uniforms:Ve([Z.common,Z.displacementmap]),vertexShader:X.depth_vert,fragmentShader:X.depth_frag},normal:{uniforms:Ve([Z.common,Z.bumpmap,Z.normalmap,Z.displacementmap,{opacity:{value:1}}]),vertexShader:X.meshnormal_vert,fragmentShader:X.meshnormal_frag},sprite:{uniforms:Ve([Z.sprite,Z.fog]),vertexShader:X.sprite_vert,fragmentShader:X.sprite_frag},background:{uniforms:{uvTransform:{value:new L},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:X.background_vert,fragmentShader:X.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new L}},vertexShader:X.backgroundCube_vert,fragmentShader:X.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:X.cube_vert,fragmentShader:X.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:X.equirect_vert,fragmentShader:X.equirect_frag},distance:{uniforms:Ve([Z.common,Z.displacementmap,{referencePosition:{value:new f},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:X.distance_vert,fragmentShader:X.distance_frag},shadow:{uniforms:Ve([Z.lights,Z.fog,{color:{value:new R(0)},opacity:{value:1}}]),vertexShader:X.shadow_vert,fragmentShader:X.shadow_frag}};rt.physical={uniforms:Ve([rt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new L},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new L},clearcoatNormalScale:{value:new N(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new L},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new L},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new L},sheen:{value:0},sheenColor:{value:new R(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new L},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new L},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new L},transmissionSamplerSize:{value:new N},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new L},attenuationDistance:{value:0},attenuationColor:{value:new R(0)},specularColor:{value:new R(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new L},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new L},anisotropyVector:{value:new N},anisotropyMap:{value:null},anisotropyMapTransform:{value:new L}}]),vertexShader:X.meshphysical_vert,fragmentShader:X.meshphysical_frag};var it={r:0,b:0,g:0},at=new Le,ot=new L;ot.set(-1,0,0,0,1,0,0,0,1);function st(e,t,n,r,i,a){let o=new R(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new J(new B(1,1,1),new A({name:`BackgroundCubeMaterial`,uniforms:P(rt.backgroundCube.uniforms),vertexShader:rt.backgroundCube.vertexShader,fragmentShader:rt.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(at.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(ot),l.material.toneMapped=Y.getTransfer(i.colorSpace)!==fe,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new J(new z(2,2),new A({name:`BackgroundMaterial`,uniforms:P(rt.background.uniforms),vertexShader:rt.background.vertexShader,fragmentShader:rt.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=Y.getTransfer(i.colorSpace)!==fe,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(it,We(e)),n.buffers.color.setClear(it.r,it.g,it.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function ct(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function lt(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function ut(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(I(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&I(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function dt(e){let t=this,n=null,r=0,i=!1,a=!1,o=new $e,s=new L,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var ft=4,pt=6,mt=20,ht=256,gt=new F,_t=new R,vt=null,yt=0,bt=0,xt=!1,St=new f,Ct=new f,wt=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=St}=i;vt=this._renderer.getRenderTarget(),yt=this._renderer.getActiveCubeFace(),bt=this._renderer.getActiveMipmapLevel(),xt=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=jt(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=At(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(vt,yt,bt),this._renderer.xr.enabled=xt,e.scissorTest=!1,Dt(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),vt=this._renderer.getRenderTarget(),yt=this._renderer.getActiveCubeFace(),bt=this._renderer.getActiveMipmapLevel(),xt=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:O,minFilter:O,generateMipmaps:!1,type:d,format:Ae,colorSpace:Ge,depthBuffer:!1},r=Et(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Et(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=Tt(r)),this._blurMaterial=kt(r,e,t),this._ggxMaterial=Ot(r,e,t)}return r}_compileMaterial(e){let t=new J(new G,e);this._renderer.compile(t,gt)}_sceneToCubeUV(e,t,n,r,i){let a=new Je(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(_t),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new J(new B,new he({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(_t),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;Dt(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=jt()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=At());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;Dt(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,gt)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-ft?n-d+ft:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,Dt(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,gt),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,Dt(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,gt)}_blur(e,t,n,r){let i=this._pingPongRenderTarget,a=Math.min(r,Math.PI)/Math.SQRT2;this._blurPass(e,i,t,n,a),this._blurPass(i,e,n,n,a)}_blurPass(e,t,n,r,i){let a=this._renderer,o=this._blurMaterial,s=this._lodMeshes[r];s.material=o;let c=o.uniforms;c.envMap.value=e.texture,c.sigma.value=i,c.mipInt.value=this._lodMax-n;let l=this._sizeLods[r];Dt(t,3*l*(r>this._lodMax-ft?r-this._lodMax+ft:0),4*(this._cubeSize-l),3*l,2*l),a.setRenderTarget(t),a.render(s,gt)}};function Tt(e){let t=[],n=[],r=e,i=e-ft+1+pt;for(let e=0;e<i;e++){let e=2**r;t.push(e);let i=1/(e-2),a=-i,o=1+i,s=[a,a,o,a,o,o,a,a,o,o,a,o],c=new Float32Array(108),l=new Float32Array(108);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];c.set(r,18*e);for(let t=0;t<6;t++){let n=s[t*2]*2-1,r=s[t*2+1]*2-1;e===0?Ct.set(1,r,n):e===1?Ct.set(-n,1,-r):e===2?Ct.set(-n,r,1):e===3?Ct.set(-1,r,-n):e===4?Ct.set(-n,-1,r):Ct.set(n,r,-1),Ct.toArray(l,(e*6+t)*3)}}let u=new G;u.setAttribute(`position`,new V(c,3)),u.setAttribute(`outputDirection`,new V(l,3)),n.push(new J(u,null)),r>ft&&r--}return{lodMeshes:n,sizeLods:t}}function Et(e,t,n){let r=new _(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function Dt(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function Ot(e,t,n){return new A({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:ht,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Mt(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function kt(e,t,n){return new A({name:`SphericalGaussianBlur`,defines:{SAMPLES:mt,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Mt(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function At(){return new A({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:Mt(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function jt(){return new A({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Mt(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Mt(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Nt=class extends _{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new c(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new B(5,5,5),i=new A({name:`CubemapFromEquirect`,uniforms:P(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new J(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=O),new Ye(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function Pt(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Nt(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new wt(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new wt(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Ft(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&Ie(`WebGLRenderer: `+e+` extension not supported.`),t}}}function It(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0||(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++),t}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?D:w)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function Lt(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Rt(e){let n={geometries:0,textures:0},r={frame:0,calls:0,triangles:0,points:0,lines:0};function i(n,i,a){switch(r.calls++,i){case e.TRIANGLES:r.triangles+=n/3*a;break;case e.LINES:r.lines+=n/2*a;break;case e.LINE_STRIP:r.lines+=a*(n-1);break;case e.LINE_LOOP:r.lines+=a*n;break;case e.POINTS:r.points+=a*n;break;default:t(`WebGLInfo: Unknown draw mode:`,i)}}function a(){r.calls=0,r.triangles=0,r.points=0,r.lines=0}return{memory:n,render:r,programs:null,autoReset:!0,reset:a,update:i}}function zt(e,t,n){let r=new WeakMap,a=new y;function o(o,s,c){let l=o.morphTargetInfluences,u=s.morphAttributes.position||s.morphAttributes.normal||s.morphAttributes.color,d=u===void 0?0:u.length,f=r.get(s);if(f===void 0||f.count!==d){f!==void 0&&f.texture.dispose();let e=s.morphAttributes.position!==void 0,n=s.morphAttributes.normal!==void 0,o=s.morphAttributes.color!==void 0,c=s.morphAttributes.position||[],l=s.morphAttributes.normal||[],u=s.morphAttributes.color||[],p=0;e===!0&&(p=1),n===!0&&(p=2),o===!0&&(p=3);let m=s.attributes.position.count*p,h=1;m>t.maxTextureSize&&(h=Math.ceil(m/t.maxTextureSize),m=t.maxTextureSize);let g=new Float32Array(m*h*4*d),_=new Oe(g,m,h,d);_.type=i,_.needsUpdate=!0;let v=p*4;for(let t=0;t<d;t++){let r=c[t],i=l[t],s=u[t],d=m*h*4*t;for(let t=0;t<r.count;t++){let c=t*v;e===!0&&(a.fromBufferAttribute(r,t),g[d+c+0]=a.x,g[d+c+1]=a.y,g[d+c+2]=a.z,g[d+c+3]=0),n===!0&&(a.fromBufferAttribute(i,t),g[d+c+4]=a.x,g[d+c+5]=a.y,g[d+c+6]=a.z,g[d+c+7]=0),o===!0&&(a.fromBufferAttribute(s,t),g[d+c+8]=a.x,g[d+c+9]=a.y,g[d+c+10]=a.z,g[d+c+11]=s.itemSize===4?a.w:1)}}f={count:d,texture:_,size:new N(m,h)},r.set(s,f);function y(){_.dispose(),r.delete(s),s.removeEventListener(`dispose`,y)}s.addEventListener(`dispose`,y)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(e,`morphTexture`,o.morphTexture,n);else{let t=0;for(let e=0;e<l.length;e++)t+=l[e];let n=s.morphTargetsRelative?1:1-t;c.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),c.getUniforms().setValue(e,`morphTargetInfluences`,l)}c.getUniforms().setValue(e,`morphTargetsTexture`,f.texture,n),c.getUniforms().setValue(e,`morphTargetsTextureSize`,f.size)}return{update:o}}function Bt(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Vt={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function Ht(e,t,n,r,i,a){let o=new _(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),s=null,c=null,l=new G;l.setAttribute(`position`,new et([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute(`uv`,new et([0,2,0,0,2,0],2));let u=new me({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),f=new J(l,u),p=new F(-1,1,1,-1,0,1),m=null,h=null,g=!1,v,y=null,b=[],x=!1;this.setSize=function(e,t){o.setSize(e,t),s!==null&&s.setSize(e,t),c!==null&&c.setSize(e,t);for(let n=0;n<b.length;n++){let r=b[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){b=e,x=b.length>0&&b[0].isRenderPass===!0;let t=o.width,n=o.height;b.length>0&&s===null&&(s=new _(t,n,{type:d,depthBuffer:!1,stencilBuffer:!1}),c=new _(t,n,{type:d,depthBuffer:!1,stencilBuffer:!1}));for(let e=0;e<b.length;e++){let r=b[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(g||e.toneMapping===0&&b.length===0)return!1;if(y=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return x===!1&&e.setRenderTarget(o),v=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return x},this.end=function(e,t){e.toneMapping=v,g=!0;let n=o,r=s;for(let i=0;i<b.length;i++){let a=b[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===s?c:s))}if(m!==e.outputColorSpace||h!==e.toneMapping){m=e.outputColorSpace,h=e.toneMapping,u.defines={},Y.getTransfer(m)===`srgb`&&(u.defines.SRGB_TRANSFER=``);let t=Vt[h];t&&(u.defines[t]=``),u.needsUpdate=!0}u.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(y),e.render(f,p),y=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.dispose(),s!==null&&s.dispose(),c!==null&&c.dispose(),l.dispose(),u.dispose()}}var Ut=new De,Wt=new C(1,1),Gt=new Oe,Kt=new T,qt=new c,Jt=[],Yt=[],Xt=new Float32Array(16),Zt=new Float32Array(9),Qt=new Float32Array(4);function $t(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=Jt[i];if(a===void 0&&(a=new Float32Array(i),Jt[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function en(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function tn(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function nn(e,t){let n=Yt[t];n===void 0&&(n=new Int32Array(t),Yt[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function rn(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function an(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(en(n,t))return;e.uniform2fv(this.addr,t),tn(n,t)}}function on(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(en(n,t))return;e.uniform3fv(this.addr,t),tn(n,t)}}function sn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(en(n,t))return;e.uniform4fv(this.addr,t),tn(n,t)}}function cn(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(en(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),tn(n,t)}else{if(en(n,r))return;Qt.set(r),e.uniformMatrix2fv(this.addr,!1,Qt),tn(n,r)}}function ln(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(en(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),tn(n,t)}else{if(en(n,r))return;Zt.set(r),e.uniformMatrix3fv(this.addr,!1,Zt),tn(n,r)}}function un(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(en(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),tn(n,t)}else{if(en(n,r))return;Xt.set(r),e.uniformMatrix4fv(this.addr,!1,Xt),tn(n,r)}}function dn(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function fn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(en(n,t))return;e.uniform2iv(this.addr,t),tn(n,t)}}function pn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(en(n,t))return;e.uniform3iv(this.addr,t),tn(n,t)}}function mn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(en(n,t))return;e.uniform4iv(this.addr,t),tn(n,t)}}function hn(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function gn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(en(n,t))return;e.uniform2uiv(this.addr,t),tn(n,t)}}function _n(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(en(n,t))return;e.uniform3uiv(this.addr,t),tn(n,t)}}function vn(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(en(n,t))return;e.uniform4uiv(this.addr,t),tn(n,t)}}function yn(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(Wt.compareFunction=n.isReversedDepthBuffer()?518:515,a=Wt):a=Ut,n.setTexture2D(t||a,i)}function bn(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||Kt,i)}function xn(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||qt,i)}function Sn(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||Gt,i)}function Cn(e){switch(e){case 5126:return rn;case 35664:return an;case 35665:return on;case 35666:return sn;case 35674:return cn;case 35675:return ln;case 35676:return un;case 5124:case 35670:return dn;case 35667:case 35671:return fn;case 35668:case 35672:return pn;case 35669:case 35673:return mn;case 5125:return hn;case 36294:return gn;case 36295:return _n;case 36296:return vn;case 35678:case 36198:case 36298:case 36306:case 35682:return yn;case 35679:case 36299:case 36307:return bn;case 35680:case 36300:case 36308:case 36293:return xn;case 36289:case 36303:case 36311:case 36292:return Sn}}function wn(e,t){e.uniform1fv(this.addr,t)}function Tn(e,t){let n=$t(t,this.size,2);e.uniform2fv(this.addr,n)}function En(e,t){let n=$t(t,this.size,3);e.uniform3fv(this.addr,n)}function Dn(e,t){let n=$t(t,this.size,4);e.uniform4fv(this.addr,n)}function On(e,t){let n=$t(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function kn(e,t){let n=$t(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function An(e,t){let n=$t(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function jn(e,t){e.uniform1iv(this.addr,t)}function Mn(e,t){e.uniform2iv(this.addr,t)}function Nn(e,t){e.uniform3iv(this.addr,t)}function Pn(e,t){e.uniform4iv(this.addr,t)}function Fn(e,t){e.uniform1uiv(this.addr,t)}function In(e,t){e.uniform2uiv(this.addr,t)}function Ln(e,t){e.uniform3uiv(this.addr,t)}function Rn(e,t){e.uniform4uiv(this.addr,t)}function zn(e,t,n){let r=this.cache,i=t.length,a=nn(n,i);en(r,a)||(e.uniform1iv(this.addr,a),tn(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?Wt:Ut;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Bn(e,t,n){let r=this.cache,i=t.length,a=nn(n,i);en(r,a)||(e.uniform1iv(this.addr,a),tn(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||Kt,a[e])}function Vn(e,t,n){let r=this.cache,i=t.length,a=nn(n,i);en(r,a)||(e.uniform1iv(this.addr,a),tn(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||qt,a[e])}function Hn(e,t,n){let r=this.cache,i=t.length,a=nn(n,i);en(r,a)||(e.uniform1iv(this.addr,a),tn(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||Gt,a[e])}function Un(e){switch(e){case 5126:return wn;case 35664:return Tn;case 35665:return En;case 35666:return Dn;case 35674:return On;case 35675:return kn;case 35676:return An;case 5124:case 35670:return jn;case 35667:case 35671:return Mn;case 35668:case 35672:return Nn;case 35669:case 35673:return Pn;case 5125:return Fn;case 36294:return In;case 36295:return Ln;case 36296:return Rn;case 35678:case 36198:case 36298:case 36306:case 35682:return zn;case 35679:case 36299:case 36307:return Bn;case 35680:case 36300:case 36308:case 36293:return Vn;case 36289:case 36303:case 36311:case 36292:return Hn}}var Wn=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Cn(t.type)}},Gn=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Un(t.type)}},Kn=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},qn=/(\w+)(\])?(\[|\.)?/g;function Jn(e,t){e.seq.push(t),e.map[t.id]=t}function Yn(e,t,n){let r=e.name,i=r.length;for(qn.lastIndex=0;;){let a=qn.exec(r),o=qn.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){Jn(n,l===void 0?new Wn(s,e,t):new Gn(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new Kn(s),Jn(n,e)),n=e}}}var Xn=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);Yn(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function Zn(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var Qn=37297,$n=0;function er(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var tr=new L;function nr(e){Y._getMatrix(tr,Y.workingColorSpace,e);let t=`mat3( ${tr.elements.map(e=>e.toFixed(4))} )`;switch(Y.getTransfer(e)){case Pe:return[t,`LinearTransferOETF`];case fe:return[t,`sRGBTransferOETF`];default:return I(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function rr(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+er(e.getShaderSource(t),r)}return i}function ir(e,t){let n=nr(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var ar={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function or(e,t){let n=ar[t];return n===void 0?(I(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var sr=new f;function cr(){return Y.getLuminanceCoefficients(sr),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${sr.x.toFixed(4)}, ${sr.y.toFixed(4)}, ${sr.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function lr(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(fr).join(`
`)}function ur(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function dr(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function fr(e){return e!==``}function pr(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function mr(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var hr=/^[ \t]*#include +<([\w\d./]+)>/gm;function gr(e){return e.replace(hr,vr)}var _r=new Map;function vr(e,t){let n=X[t];if(n===void 0){let e=_r.get(t);if(e!==void 0)n=X[e],I(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return gr(n)}var yr=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function br(e){return e.replace(yr,xr)}function xr(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Sr(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var Cr={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function wr(e){return Cr[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Tr={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function Er(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:Tr[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var Dr={302:`ENVMAP_MODE_REFRACTION`};function Or(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Dr[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var kr={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Ar(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:kr[e.combine]||`ENVMAP_BLENDING_NONE`}function jr(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function Mr(e,n,r,i){let a=e.getContext(),o=r.defines,s=r.vertexShader,c=r.fragmentShader,l=wr(r),u=Er(r),d=Or(r),f=Ar(r),p=jr(r),m=lr(r),h=ur(o),g=a.createProgram(),_,v,y=r.glslVersion?`#version `+r.glslVersion+`
`:``;r.isRawShaderMaterial?(_=[`#define SHADER_TYPE `+r.shaderType,`#define SHADER_NAME `+r.shaderName,h].filter(fr).join(`
`),_.length>0&&(_+=`
`),v=[`#define SHADER_TYPE `+r.shaderType,`#define SHADER_NAME `+r.shaderName,h].filter(fr).join(`
`),v.length>0&&(v+=`
`)):(_=[Sr(r),`#define SHADER_TYPE `+r.shaderType,`#define SHADER_NAME `+r.shaderName,h,r.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,r.batching?`#define USE_BATCHING`:``,r.batchingColor?`#define USE_BATCHING_COLOR`:``,r.instancing?`#define USE_INSTANCING`:``,r.instancingColor?`#define USE_INSTANCING_COLOR`:``,r.instancingMorph?`#define USE_INSTANCING_MORPH`:``,r.useFog&&r.fog?`#define USE_FOG`:``,r.useFog&&r.fogExp2?`#define FOG_EXP2`:``,r.map?`#define USE_MAP`:``,r.envMap?`#define USE_ENVMAP`:``,r.envMap?`#define `+d:``,r.lightMap?`#define USE_LIGHTMAP`:``,r.aoMap?`#define USE_AOMAP`:``,r.bumpMap?`#define USE_BUMPMAP`:``,r.normalMap?`#define USE_NORMALMAP`:``,r.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,r.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,r.displacementMap?`#define USE_DISPLACEMENTMAP`:``,r.emissiveMap?`#define USE_EMISSIVEMAP`:``,r.anisotropy?`#define USE_ANISOTROPY`:``,r.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,r.clearcoatMap?`#define USE_CLEARCOATMAP`:``,r.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,r.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,r.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,r.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,r.specularMap?`#define USE_SPECULARMAP`:``,r.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,r.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,r.roughnessMap?`#define USE_ROUGHNESSMAP`:``,r.metalnessMap?`#define USE_METALNESSMAP`:``,r.alphaMap?`#define USE_ALPHAMAP`:``,r.alphaHash?`#define USE_ALPHAHASH`:``,r.transmission?`#define USE_TRANSMISSION`:``,r.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,r.thicknessMap?`#define USE_THICKNESSMAP`:``,r.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,r.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,r.mapUv?`#define MAP_UV `+r.mapUv:``,r.alphaMapUv?`#define ALPHAMAP_UV `+r.alphaMapUv:``,r.lightMapUv?`#define LIGHTMAP_UV `+r.lightMapUv:``,r.aoMapUv?`#define AOMAP_UV `+r.aoMapUv:``,r.emissiveMapUv?`#define EMISSIVEMAP_UV `+r.emissiveMapUv:``,r.bumpMapUv?`#define BUMPMAP_UV `+r.bumpMapUv:``,r.normalMapUv?`#define NORMALMAP_UV `+r.normalMapUv:``,r.displacementMapUv?`#define DISPLACEMENTMAP_UV `+r.displacementMapUv:``,r.metalnessMapUv?`#define METALNESSMAP_UV `+r.metalnessMapUv:``,r.roughnessMapUv?`#define ROUGHNESSMAP_UV `+r.roughnessMapUv:``,r.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+r.anisotropyMapUv:``,r.clearcoatMapUv?`#define CLEARCOATMAP_UV `+r.clearcoatMapUv:``,r.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+r.clearcoatNormalMapUv:``,r.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+r.clearcoatRoughnessMapUv:``,r.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+r.iridescenceMapUv:``,r.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+r.iridescenceThicknessMapUv:``,r.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+r.sheenColorMapUv:``,r.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+r.sheenRoughnessMapUv:``,r.specularMapUv?`#define SPECULARMAP_UV `+r.specularMapUv:``,r.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+r.specularColorMapUv:``,r.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+r.specularIntensityMapUv:``,r.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+r.transmissionMapUv:``,r.thicknessMapUv?`#define THICKNESSMAP_UV `+r.thicknessMapUv:``,r.vertexTangents&&r.flatShading===!1?`#define USE_TANGENT`:``,r.vertexNormals?`#define HAS_NORMAL`:``,r.vertexColors?`#define USE_COLOR`:``,r.vertexAlphas?`#define USE_COLOR_ALPHA`:``,r.vertexUv1s?`#define USE_UV1`:``,r.vertexUv2s?`#define USE_UV2`:``,r.vertexUv3s?`#define USE_UV3`:``,r.pointsUvs?`#define USE_POINTS_UV`:``,r.flatShading?`#define FLAT_SHADED`:``,r.skinning?`#define USE_SKINNING`:``,r.morphTargets?`#define USE_MORPHTARGETS`:``,r.morphNormals&&r.flatShading===!1?`#define USE_MORPHNORMALS`:``,r.morphColors?`#define USE_MORPHCOLORS`:``,r.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+r.morphTextureStride:``,r.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+r.morphTargetsCount:``,r.doubleSided?`#define DOUBLE_SIDED`:``,r.flipSided?`#define FLIP_SIDED`:``,r.shadowMapEnabled?`#define USE_SHADOWMAP`:``,r.shadowMapEnabled?`#define `+l:``,r.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,r.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,r.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,r.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(fr).join(`
`),v=[Sr(r),`#define SHADER_TYPE `+r.shaderType,`#define SHADER_NAME `+r.shaderName,h,r.useFog&&r.fog?`#define USE_FOG`:``,r.useFog&&r.fogExp2?`#define FOG_EXP2`:``,r.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,r.map?`#define USE_MAP`:``,r.matcap?`#define USE_MATCAP`:``,r.envMap?`#define USE_ENVMAP`:``,r.envMap?`#define `+u:``,r.envMap?`#define `+d:``,r.envMap?`#define `+f:``,p?`#define CUBEUV_TEXEL_WIDTH `+p.texelWidth:``,p?`#define CUBEUV_TEXEL_HEIGHT `+p.texelHeight:``,p?`#define CUBEUV_MAX_MIP `+p.maxMip+`.0`:``,r.lightMap?`#define USE_LIGHTMAP`:``,r.aoMap?`#define USE_AOMAP`:``,r.bumpMap?`#define USE_BUMPMAP`:``,r.normalMap?`#define USE_NORMALMAP`:``,r.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,r.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,r.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,r.emissiveMap?`#define USE_EMISSIVEMAP`:``,r.anisotropy?`#define USE_ANISOTROPY`:``,r.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,r.clearcoat?`#define USE_CLEARCOAT`:``,r.clearcoatMap?`#define USE_CLEARCOATMAP`:``,r.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,r.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,r.dispersion?`#define USE_DISPERSION`:``,r.retroreflection?`#define USE_RETROREFLECTION`:``,r.iridescence?`#define USE_IRIDESCENCE`:``,r.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,r.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,r.specularMap?`#define USE_SPECULARMAP`:``,r.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,r.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,r.roughnessMap?`#define USE_ROUGHNESSMAP`:``,r.metalnessMap?`#define USE_METALNESSMAP`:``,r.alphaMap?`#define USE_ALPHAMAP`:``,r.alphaTest?`#define USE_ALPHATEST`:``,r.alphaHash?`#define USE_ALPHAHASH`:``,r.sheen?`#define USE_SHEEN`:``,r.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,r.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,r.transmission?`#define USE_TRANSMISSION`:``,r.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,r.thicknessMap?`#define USE_THICKNESSMAP`:``,r.vertexTangents&&r.flatShading===!1?`#define USE_TANGENT`:``,r.vertexColors||r.instancingColor?`#define USE_COLOR`:``,r.vertexAlphas||r.batchingColor?`#define USE_COLOR_ALPHA`:``,r.vertexUv1s?`#define USE_UV1`:``,r.vertexUv2s?`#define USE_UV2`:``,r.vertexUv3s?`#define USE_UV3`:``,r.pointsUvs?`#define USE_POINTS_UV`:``,r.gradientMap?`#define USE_GRADIENTMAP`:``,r.flatShading?`#define FLAT_SHADED`:``,r.doubleSided?`#define DOUBLE_SIDED`:``,r.flipSided?`#define FLIP_SIDED`:``,r.shadowMapEnabled?`#define USE_SHADOWMAP`:``,r.shadowMapEnabled?`#define `+l:``,r.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,r.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,r.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,r.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,r.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,r.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,r.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,r.toneMapping===0?``:`#define TONE_MAPPING`,r.toneMapping===0?``:X.tonemapping_pars_fragment,r.toneMapping===0?``:or(`toneMapping`,r.toneMapping),r.dithering?`#define DITHERING`:``,r.opaque?`#define OPAQUE`:``,X.colorspace_pars_fragment,ir(`linearToOutputTexel`,r.outputColorSpace),cr(),r.useDepthPacking?`#define DEPTH_PACKING `+r.depthPacking:``,`
`].filter(fr).join(`
`)),s=gr(s),s=pr(s,r),s=mr(s,r),c=gr(c),c=pr(c,r),c=mr(c,r),s=br(s),c=br(c),r.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,_=[m,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+_,v=[`#define varying in`,r.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,r.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+v);let b=y+_+s,x=y+v+c,S=Zn(a,a.VERTEX_SHADER,b),C=Zn(a,a.FRAGMENT_SHADER,x);a.attachShader(g,S),a.attachShader(g,C),r.index0AttributeName===void 0?r.hasPositionAttribute===!0&&a.bindAttribLocation(g,0,`position`):a.bindAttribLocation(g,0,r.index0AttributeName),a.linkProgram(g);function w(n){if(e.debug.checkShaderErrors){let r=a.getProgramInfoLog(g)||``,i=a.getShaderInfoLog(S)||``,o=a.getShaderInfoLog(C)||``,s=r.trim(),c=i.trim(),l=o.trim(),u=!0,d=!0;if(a.getProgramParameter(g,a.LINK_STATUS)===!1){if(u=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(a,g,S,C);else{let e=rr(a,S,`vertex`),r=rr(a,C,`fragment`);t(`WebGLProgram: Shader Error `+a.getError()+` - VALIDATE_STATUS `+a.getProgramParameter(g,a.VALIDATE_STATUS)+`

Material Name: `+n.name+`
Material Type: `+n.type+`

Program Info Log: `+s+`
`+e+`
`+r)}}else s===``?(c===``||l===``)&&(d=!1):I(`WebGLProgram: Program Info Log:`,s);d&&(n.diagnostics={runnable:u,programLog:s,vertexShader:{log:c,prefix:_},fragmentShader:{log:l,prefix:v}})}a.deleteShader(S),a.deleteShader(C),T=new Xn(a,g),E=dr(a,g)}let T;this.getUniforms=function(){return T===void 0&&w(this),T};let E;this.getAttributes=function(){return E===void 0&&w(this),E};let D=r.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return D===!1&&(D=a.getProgramParameter(g,Qn)),D},this.destroy=function(){i.releaseStatesOfProgram(this),a.deleteProgram(g),this.program=void 0},this.type=r.shaderType,this.name=r.shaderName,this.id=$n++,this.cacheKey=n,this.usedTimes=1,this.program=g,this.vertexShader=S,this.fragmentShader=C,this}var Nr=0,Pr=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Fr(e),t.set(e,n)),n}},Fr=class{constructor(e){this.id=Nr++,this.code=e,this.usedTimes=0}};function Ir(e){return e===1030||e===37490||e===36285}function Lr(e,t,n,r,i,a){let o=new se,s=new Pr,c=new Set,l=[],d=new Map,f=r.logarithmicDepthBuffer,p=r.precision,m={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function h(e){return c.add(e),e===0?`uv`:`uv${e}`}function g(i,o,l,u,d,g){let _=u.fog,v=d.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=m[i.type];i.precision!==null&&(p=r.getMaxPrecision(i.precision),p!==i.precision&&I(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,p,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,ee,te;if(C){let e=rt[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),ee=e.id,te=t.id}let ne=e.getRenderTarget(),k=e.state.buffers.depth.getReversed(),A=d.isInstancedMesh===!0,j=d.isBatchedMesh===!0,re=!!i.map,ie=!!i.matcap,ae=!!x,M=!!i.aoMap,N=!!i.lightMap,oe=!!i.bumpMap&&i.wireframe===!1,P=!!i.normalMap,se=!!i.displacementMap,ce=!!i.emissiveMap,le=!!i.metalnessMap,ue=!!i.roughnessMap,de=i.anisotropy>0,F=i.clearcoat>0,L=i.dispersion>0,R=i.retroreflectivity>0,fe=i.iridescence>0,z=i.sheen>0,pe=i.transmission>0,me=de&&!!i.anisotropyMap,he=F&&!!i.clearcoatMap,B=F&&!!i.clearcoatNormalMap,ge=F&&!!i.clearcoatRoughnessMap,_e=fe&&!!i.iridescenceMap,ve=fe&&!!i.iridescenceThicknessMap,V=z&&!!i.sheenColorMap,ye=z&&!!i.sheenRoughnessMap,be=!!i.specularMap,xe=!!i.specularColorMap,Se=!!i.specularIntensityMap,Ce=pe&&!!i.transmissionMap,we=pe&&!!i.thicknessMap,H=!!i.gradientMap,Te=!!i.alphaMap,U=i.alphaTest>0,Ee=!!i.alphaHash,De=!!i.extensions,Oe=0;i.toneMapped&&(ne===null||ne.isXRRenderTarget===!0)&&(Oe=e.toneMapping);let ke={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:ee,customFragmentShaderID:te,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:p,batching:j,batchingColor:j&&d._colorsTexture!==null,instancing:A,instancingColor:A&&d.instanceColor!==null,instancingMorph:A&&d.morphTexture!==null,outputColorSpace:ne===null?e.outputColorSpace:ne.isXRRenderTarget===!0?ne.texture.colorSpace:Y.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:re,matcap:ie,envMap:ae,envMapMode:ae&&x.mapping,envMapCubeUVHeight:S,aoMap:M,lightMap:N,bumpMap:oe,normalMap:P,displacementMap:se,emissiveMap:ce,normalMapObjectSpace:P&&i.normalMapType===1,normalMapTangentSpace:P&&i.normalMapType===0,packedNormalMap:P&&i.normalMapType===0&&Ir(i.normalMap.format),metalnessMap:le,roughnessMap:ue,anisotropy:de,anisotropyMap:me,clearcoat:F,clearcoatMap:he,clearcoatNormalMap:B,clearcoatRoughnessMap:ge,dispersion:L,retroreflection:R,iridescence:fe,iridescenceMap:_e,iridescenceThicknessMap:ve,sheen:z,sheenColorMap:V,sheenRoughnessMap:ye,specularMap:be,specularColorMap:xe,specularIntensityMap:Se,transmission:pe,transmissionMap:Ce,thicknessMap:we,gradientMap:H,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Te,alphaTest:U,alphaHash:Ee,combine:i.combine,mapUv:re&&h(i.map.channel),aoMapUv:M&&h(i.aoMap.channel),lightMapUv:N&&h(i.lightMap.channel),bumpMapUv:oe&&h(i.bumpMap.channel),normalMapUv:P&&h(i.normalMap.channel),displacementMapUv:se&&h(i.displacementMap.channel),emissiveMapUv:ce&&h(i.emissiveMap.channel),metalnessMapUv:le&&h(i.metalnessMap.channel),roughnessMapUv:ue&&h(i.roughnessMap.channel),anisotropyMapUv:me&&h(i.anisotropyMap.channel),clearcoatMapUv:he&&h(i.clearcoatMap.channel),clearcoatNormalMapUv:B&&h(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ge&&h(i.clearcoatRoughnessMap.channel),iridescenceMapUv:_e&&h(i.iridescenceMap.channel),iridescenceThicknessMapUv:ve&&h(i.iridescenceThicknessMap.channel),sheenColorMapUv:V&&h(i.sheenColorMap.channel),sheenRoughnessMapUv:ye&&h(i.sheenRoughnessMap.channel),specularMapUv:be&&h(i.specularMap.channel),specularColorMapUv:xe&&h(i.specularColorMap.channel),specularIntensityMapUv:Se&&h(i.specularIntensityMap.channel),transmissionMapUv:Ce&&h(i.transmissionMap.channel),thicknessMapUv:we&&h(i.thicknessMap.channel),alphaMapUv:Te&&h(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(P||de),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:d.isPoints===!0&&!!v.attributes.uv&&(re||Te),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&P===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:k,skinning:d.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Oe,decodeVideoTexture:re&&i.map.isVideoTexture===!0&&Y.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:ce&&i.emissiveMap.isVideoTexture===!0&&Y.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:De&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(De&&i.extensions.multiDraw===!0||j)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return ke.vertexUv1s=c.has(1),ke.vertexUv2s=c.has(2),ke.vertexUv3s=c.has(3),c.clear(),ke}function _(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(v(n,t),y(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function v(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function y(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function b(e){let t=m[e.type],n;if(t){let e=rt[t];n=u.clone(e.uniforms)}else n=e.uniforms;return n}function x(t,n){let r=d.get(n);return r===void 0?(r=new Mr(e,n,t,i),l.push(r),d.set(n,r)):++r.usedTimes,r}function S(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),d.delete(e.cacheKey),e.destroy()}}function C(e){s.remove(e)}function w(){s.dispose()}return{getParameters:g,getProgramCacheKey:_,getUniforms:b,acquireProgram:x,releaseProgram:S,releaseShaderCache:C,programs:l,dispose:w}}function Rr(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function zr(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Br(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Vr(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||zr),r.length>1&&r.sort(t||Br),i.length>1&&i.sort(t||Br)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Hr(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Vr,e.set(t,[i])):n>=r.length?(i=new Vr,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Ur(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new f,color:new R};break;case`SpotLight`:n={position:new f,direction:new f,color:new R,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new f,color:new R,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new f,skyColor:new R,groundColor:new R};break;case`RectAreaLight`:n={color:new R,position:new f,halfWidth:new f,halfHeight:new f}}return e[t.id]=n,n}}}function Wr(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new N};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new N};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new N,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var Gr=0;function Kr(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function qr(e){let t=new Ur,n=Wr(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new f);let i=new f,a=new Le,o=new Le;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(Kr);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=Z.LTC_FLOAT_1,r.rectAreaLTC2=Z.LTC_FLOAT_2):(r.rectAreaLTC1=Z.LTC_HALF_1,r.rectAreaLTC2=Z.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=Gr++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function Jr(e){let t=new qr(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function Yr(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Jr(e),t.set(n,[a])):r>=i.length?(a=new Jr(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Xr=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Zr=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Qr=[new f(1,0,0),new f(-1,0,0),new f(0,1,0),new f(0,-1,0),new f(0,0,1),new f(0,0,-1)],$r=[new f(0,-1,0),new f(0,-1,0),new f(0,0,1),new f(0,0,-1),new f(0,-1,0),new f(0,-1,0)],ei=new Le,ti=new f,ni=new f;function ri(e,t,n){let r=new p,o=new N,s=new N,c=new y,l=new je,u=new Ke,f={},m=n.maxTextureSize,h={0:1,1:0,2:2},g=new A({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new N},radius:{value:4}},vertexShader:Xr,fragmentShader:Zr}),v=g.clone();v.defines.HORIZONTAL_PASS=1;let b=new G;b.setAttribute(`position`,new V(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let x=new J(b,g),S=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let w=this.type;this.render=function(t,n,l){if(S.enabled===!1||S.autoUpdate===!1&&S.needsUpdate===!1||t.length===0)return;this.type===2&&(I(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let u=e.getRenderTarget(),f=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),h=e.state;h.setBlending(0),h.buffers.depth.getReversed()===!0?h.buffers.color.setClear(0,0,0,0):h.buffers.color.setClear(1,1,1,1),h.buffers.depth.setTest(!0),h.setScissorTest(!1);let g=w!==this.type;g&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let u=0,f=t.length;u<f;u++){let f=t[u],p=f.shadow;if(p===void 0){I(`WebGLShadowMap:`,f,`has no shadow.`);continue}if(p.autoUpdate===!1&&p.needsUpdate===!1)continue;o.copy(p.mapSize);let v=p.getFrameExtents();o.multiply(v),s.copy(p.mapSize),(o.x>m||o.y>m)&&(o.x>m&&(s.x=Math.floor(m/v.x),o.x=s.x*v.x,p.mapSize.x=s.x),o.y>m&&(s.y=Math.floor(m/v.y),o.y=s.y*v.y,p.mapSize.y=s.y));let y=e.state.buffers.depth.getReversed();if(p.camera._reversedDepth=y,p.map===null||g===!0){if(p.map!==null&&(p.map.depthTexture!==null&&(p.map.depthTexture.dispose(),p.map.depthTexture=null),p.map.dispose()),this.type===3){if(f.isPointLight){I(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}p.map=new _(o.x,o.y,{format:Fe,type:d,minFilter:O,magFilter:O,generateMipmaps:!1}),p.map.texture.name=f.name+`.shadowMap`,p.map.depthTexture=new C(o.x,o.y,i),p.map.depthTexture.name=f.name+`.shadowMapDepth`,p.map.depthTexture.format=Ee,p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=K,p.map.depthTexture.magFilter=K}else f.isPointLight?(p.map=new Nt(o.x),p.map.depthTexture=new j(o.x,a)):(p.map=new _(o.x,o.y),p.map.depthTexture=new C(o.x,o.y,a)),p.map.depthTexture.name=f.name+`.shadowMap`,p.map.depthTexture.format=Ee,this.type===1?(p.map.depthTexture.compareFunction=y?518:515,p.map.depthTexture.minFilter=O,p.map.depthTexture.magFilter=O):(p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=K,p.map.depthTexture.magFilter=K);p.camera.updateProjectionMatrix()}p.map.isWebGLCubeRenderTarget!==!0&&(p.map.width!==o.x||p.map.height!==o.y)&&p.map.setSize(o.x,o.y);let b=p.map.isWebGLCubeRenderTarget?6:p.getViewportCount();f.isPointLight!==!0&&p.updateMatrices(f,l);for(let t=0;t<b;t++){let i=p.getCamera(t);if(f.isPointLight){let e=p.camera,n=p.matrix,r=f.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),ti.setFromMatrixPosition(f.matrixWorld),e.position.copy(ti),ni.copy(e.position),ni.add(Qr[t]),e.up.copy($r[t]),e.lookAt(ni),e.updateMatrixWorld(),n.makeTranslation(-ti.x,-ti.y,-ti.z),ei.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),p._frustum.setFromProjectionMatrix(ei,e.coordinateSystem,e.reversedDepth)}if(p.map.isWebGLCubeRenderTarget)e.setRenderTarget(p.map,t),e.clear();else{t===0&&(e.setRenderTarget(p.map),e.clear());let n=p.getViewport(t);c.set(s.x*n.x,s.y*n.y,s.x*n.z,s.y*n.w),h.viewport(c)}r=p.getFrustum(t),D(n,l,i,f,this.type)}p.isPointLightShadow!==!0&&this.type===3&&T(p,l),p.needsUpdate=!1}w=this.type,S.needsUpdate=!1,e.setRenderTarget(u,f,p)};function T(n,r){let i=t.update(x);g.defines.VSM_SAMPLES!==n.blurSamples&&(g.defines.VSM_SAMPLES=n.blurSamples,v.defines.VSM_SAMPLES=n.blurSamples,g.needsUpdate=!0,v.needsUpdate=!0),n.mapPass===null?n.mapPass=new _(o.x,o.y,{format:Fe,type:d}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),g.uniforms.shadow_pass.value=n.map.depthTexture,g.uniforms.resolution.value.set(n.map.width,n.map.height),g.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,i,g,x,null),v.uniforms.shadow_pass.value=n.mapPass.texture,v.uniforms.resolution.value.set(n.map.width,n.map.height),v.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,i,v,x,null)}function E(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?u:l,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=f[e];r===void 0&&(r={},f[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,ee)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?h[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function D(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||n.intersectsFrustum(r))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),c=n.material;if(Array.isArray(c)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=E(n,d,o,s);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(c.visible){let t=E(n,c,o,s);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)D(c[e],i,a,o,s)}function ee(e){e.target.removeEventListener(`dispose`,ee);for(let t in f){let n=f[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function ii(e,n){function r(){let t=!1,n=new y,r=null,i=new y(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function i(){let t=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let t=n.get(`EXT_clip_control`);e?t.clipControlEXT(t.LOWER_LEFT_EXT,t.ZERO_TO_ONE_EXT):t.clipControlEXT(t.LOWER_LEFT_EXT,t.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?de(e.DEPTH_TEST):F(e.DEPTH_TEST)},setMask:function(n){i!==n&&!t&&(e.depthMask(n),i=n)},setFunc:function(t){if(r&&(t=Me[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){t=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){t=!1,i=null,a=null,o=null,r=!1}}}function a(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?de(e.STENCIL_TEST):F(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let o=new r,s=new i,c=new a,l=new WeakMap,u=new WeakMap,d={},f={},p={},m=new WeakMap,h=[],g=null,_=!1,v=null,b=null,x=null,S=null,C=null,w=null,T=null,E=new R(0,0,0),D=0,O=!1,ee=null,te=null,ne=null,k=null,A=null,j=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),re=!1,ie=0,ae=e.getParameter(e.VERSION);ae.indexOf(`WebGL`)===-1?ae.indexOf(`OpenGL ES`)!==-1&&(ie=parseFloat(/^OpenGL ES (\d)/.exec(ae)[1]),re=ie>=2):(ie=parseFloat(/^WebGL (\d)/.exec(ae)[1]),re=ie>=1);let M=null,N={},oe=e.getParameter(e.SCISSOR_BOX),P=e.getParameter(e.VIEWPORT),se=new y().fromArray(oe),ce=new y().fromArray(P);function le(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let ue={};ue[e.TEXTURE_2D]=le(e.TEXTURE_2D,e.TEXTURE_2D,1),ue[e.TEXTURE_CUBE_MAP]=le(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ue[e.TEXTURE_2D_ARRAY]=le(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ue[e.TEXTURE_3D]=le(e.TEXTURE_3D,e.TEXTURE_3D,1,1),o.setClear(0,0,0,1),s.setClear(1),c.setClear(0),de(e.DEPTH_TEST),s.setFunc(3),B(!1),ge(1),de(e.CULL_FACE),me(0);function de(t){d[t]!==!0&&(e.enable(t),d[t]=!0)}function F(t){d[t]!==!1&&(e.disable(t),d[t]=!1)}function I(t,n){return p[t]!==n&&(e.bindFramebuffer(t,n),p[t]=n,t===e.DRAW_FRAMEBUFFER&&(p[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(p[e.DRAW_FRAMEBUFFER]=n),!0)}function L(t,n){let r=h,i=!1;if(t){r=m.get(n),r===void 0&&(r=[],m.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function fe(t){return g!==t&&(e.useProgram(t),g=t,!0)}let z={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};z[103]=e.MIN,z[104]=e.MAX;let pe={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function me(n,r,i,a,o,s,c,l,u,d){if(n===0)_===!0&&(F(e.BLEND),_=!1);else if(_===!1&&(de(e.BLEND),_=!0),n!==5){if(n!==v||d!==O){if((b!==100||C!==100)&&(e.blendEquation(e.FUNC_ADD),b=100,C=100),d)switch(n){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:t(`WebGLState: Invalid blending: `,n)}else switch(n){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:t(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:t(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:t(`WebGLState: Invalid blending: `,n)}x=null,S=null,w=null,T=null,E.set(0,0,0),D=0,v=n,O=d}}else o||=r,s||=i,c||=a,(r!==b||o!==C)&&(e.blendEquationSeparate(z[r],z[o]),b=r,C=o),(i!==x||a!==S||s!==w||c!==T)&&(e.blendFuncSeparate(pe[i],pe[a],pe[s],pe[c]),x=i,S=a,w=s,T=c),(l.equals(E)===!1||u!==D)&&(e.blendColor(l.r,l.g,l.b,u),E.copy(l),D=u),v=n,O=!1}function he(t,n){t.side===2?F(e.CULL_FACE):de(e.CULL_FACE);let r=t.side===1;n&&(r=!r),B(r),t.blending===1&&t.transparent===!1?me(0):me(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),s.setFunc(t.depthFunc),s.setTest(t.depthTest),s.setMask(t.depthWrite),o.setMask(t.colorWrite);let i=t.stencilWrite;c.setTest(i),i&&(c.setMask(t.stencilWriteMask),c.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),c.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),ve(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?de(e.SAMPLE_ALPHA_TO_COVERAGE):F(e.SAMPLE_ALPHA_TO_COVERAGE)}function B(t){ee!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),ee=t)}function ge(t){t===0?F(e.CULL_FACE):(de(e.CULL_FACE),t!==te&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),te=t}function _e(t){t!==ne&&(re&&e.lineWidth(t),ne=t)}function ve(t,n,r){t?(de(e.POLYGON_OFFSET_FILL),(k!==n||A!==r)&&(k=n,A=r,s.getReversed()&&(n=-n),e.polygonOffset(n,r))):F(e.POLYGON_OFFSET_FILL)}function V(t){t?de(e.SCISSOR_TEST):F(e.SCISSOR_TEST)}function ye(t){t===void 0&&(t=e.TEXTURE0+j-1),M!==t&&(e.activeTexture(t),M=t)}function be(t,n,r){r===void 0&&(r=M===null?e.TEXTURE0+j-1:M);let i=N[r];i===void 0&&(i={type:void 0,texture:void 0},N[r]=i),(i.type!==t||i.texture!==n)&&(M!==r&&(e.activeTexture(r),M=r),e.bindTexture(t,n||ue[t]),i.type=t,i.texture=n)}function xe(){let t=N[M];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Se(){try{e.compressedTexImage2D(...arguments)}catch(e){t(`WebGLState:`,e)}}function Ce(){try{e.compressedTexImage3D(...arguments)}catch(e){t(`WebGLState:`,e)}}function we(){try{e.texSubImage2D(...arguments)}catch(e){t(`WebGLState:`,e)}}function H(){try{e.texSubImage3D(...arguments)}catch(e){t(`WebGLState:`,e)}}function Te(){try{e.compressedTexSubImage2D(...arguments)}catch(e){t(`WebGLState:`,e)}}function U(){try{e.compressedTexSubImage3D(...arguments)}catch(e){t(`WebGLState:`,e)}}function Ee(){try{e.texStorage2D(...arguments)}catch(e){t(`WebGLState:`,e)}}function De(){try{e.texStorage3D(...arguments)}catch(e){t(`WebGLState:`,e)}}function Oe(){try{e.texImage2D(...arguments)}catch(e){t(`WebGLState:`,e)}}function ke(){try{e.texImage3D(...arguments)}catch(e){t(`WebGLState:`,e)}}function Ae(t){return f[t]===void 0?e.getParameter(t):f[t]}function je(t,n){f[t]!==n&&(e.pixelStorei(t,n),f[t]=n)}function W(t){se.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),se.copy(t))}function Ne(t){ce.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),ce.copy(t))}function Pe(t,n){let r=u.get(n);r===void 0&&(r=new WeakMap,u.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function Fe(t,n){let r=u.get(n).get(t);l.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),l.set(n,r))}function Ie(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),s.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),d={},f={},M=null,N={},p={},m=new WeakMap,h=[],g=null,_=!1,v=null,b=null,x=null,S=null,C=null,w=null,T=null,E=new R(0,0,0),D=0,O=!1,ee=null,te=null,ne=null,k=null,A=null,se.set(0,0,e.canvas.width,e.canvas.height),ce.set(0,0,e.canvas.width,e.canvas.height),o.reset(),s.reset(),c.reset()}return{buffers:{color:o,depth:s,stencil:c},enable:de,disable:F,bindFramebuffer:I,drawBuffers:L,useProgram:fe,setBlending:me,setMaterial:he,setFlipSided:B,setCullFace:ge,setLineWidth:_e,setPolygonOffset:ve,setScissorTest:V,activeTexture:ye,bindTexture:be,unbindTexture:xe,compressedTexImage2D:Se,compressedTexImage3D:Ce,texImage2D:Oe,texImage3D:ke,pixelStorei:je,getParameter:Ae,updateUBOMapping:Pe,uniformBlockBinding:Fe,texStorage2D:Ee,texStorage3D:De,texSubImage2D:we,texSubImage3D:H,compressedTexSubImage2D:Te,compressedTexSubImage3D:U,scissor:W,viewport:Ne,reset:Ie}}function ai(n,r,i,a,o,s,c){let l=r.has(`WEBGL_multisampled_render_to_texture`)?r.get(`WEBGL_multisampled_render_to_texture`):null,u=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),d=new N,f=new WeakMap,p=new Set,m,h=new WeakMap,g=!1;try{g=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function _(e,t){return g?new OffscreenCanvas(e,t):ee(`canvas`)}function v(e,t,n){let r=1,i=Oe(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);m===void 0&&(m=_(n,a));let o=t?_(n,a):m;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),I(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&I(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function y(e){return e.generateMipmaps}function b(e){n.generateMipmap(e)}function S(e){return e.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:e.isWebGL3DRenderTarget?n.TEXTURE_3D:e.isWebGLArrayRenderTarget||e.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function C(e,t,i,a,o,s=!1){if(e!==null){if(n[e]!==void 0)return n[e];I(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+e+`'`)}let c;a&&(c=r.get(`EXT_texture_norm16`),c||I(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=t;if(t===n.RED&&(i===n.FLOAT&&(l=n.R32F),i===n.HALF_FLOAT&&(l=n.R16F),i===n.UNSIGNED_BYTE&&(l=n.R8),i===n.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===n.SHORT&&c&&(l=c.R16_SNORM_EXT)),t===n.RED_INTEGER&&(i===n.UNSIGNED_BYTE&&(l=n.R8UI),i===n.UNSIGNED_SHORT&&(l=n.R16UI),i===n.UNSIGNED_INT&&(l=n.R32UI),i===n.BYTE&&(l=n.R8I),i===n.SHORT&&(l=n.R16I),i===n.INT&&(l=n.R32I)),t===n.RG&&(i===n.FLOAT&&(l=n.RG32F),i===n.HALF_FLOAT&&(l=n.RG16F),i===n.UNSIGNED_BYTE&&(l=n.RG8),i===n.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===n.SHORT&&c&&(l=c.RG16_SNORM_EXT)),t===n.RG_INTEGER&&(i===n.UNSIGNED_BYTE&&(l=n.RG8UI),i===n.UNSIGNED_SHORT&&(l=n.RG16UI),i===n.UNSIGNED_INT&&(l=n.RG32UI),i===n.BYTE&&(l=n.RG8I),i===n.SHORT&&(l=n.RG16I),i===n.INT&&(l=n.RG32I)),t===n.RGB_INTEGER&&(i===n.UNSIGNED_BYTE&&(l=n.RGB8UI),i===n.UNSIGNED_SHORT&&(l=n.RGB16UI),i===n.UNSIGNED_INT&&(l=n.RGB32UI),i===n.BYTE&&(l=n.RGB8I),i===n.SHORT&&(l=n.RGB16I),i===n.INT&&(l=n.RGB32I)),t===n.RGBA_INTEGER&&(i===n.UNSIGNED_BYTE&&(l=n.RGBA8UI),i===n.UNSIGNED_SHORT&&(l=n.RGBA16UI),i===n.UNSIGNED_INT&&(l=n.RGBA32UI),i===n.BYTE&&(l=n.RGBA8I),i===n.SHORT&&(l=n.RGBA16I),i===n.INT&&(l=n.RGBA32I)),t===n.RGB&&(i===n.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===n.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===n.UNSIGNED_INT_5_9_9_9_REV&&(l=n.RGB9_E5),i===n.UNSIGNED_INT_10F_11F_11F_REV&&(l=n.R11F_G11F_B10F)),t===n.RGBA){let e=s?Pe:Y.getTransfer(o);i===n.FLOAT&&(l=n.RGBA32F),i===n.HALF_FLOAT&&(l=n.RGBA16F),i===n.UNSIGNED_BYTE&&(l=e===`srgb`?n.SRGB8_ALPHA8:n.RGBA8),i===n.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===n.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===n.UNSIGNED_SHORT_4_4_4_4&&(l=n.RGBA4),i===n.UNSIGNED_SHORT_5_5_5_1&&(l=n.RGB5_A1)}return(l===n.R16F||l===n.R32F||l===n.RG16F||l===n.RG32F||l===n.RGBA16F||l===n.RGBA32F)&&r.get(`EXT_color_buffer_float`),l}function w(e,t){let r;return e?t===null||t===1014||t===1020?r=n.DEPTH24_STENCIL8:t===1015?r=n.DEPTH32F_STENCIL8:t===1012&&(r=n.DEPTH24_STENCIL8,I(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):t===null||t===1014||t===1020?r=n.DEPTH_COMPONENT24:t===1015?r=n.DEPTH_COMPONENT32F:t===1012&&(r=n.DEPTH_COMPONENT16),r}function T(e,t){return y(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function E(e){let t=e.target;t.removeEventListener(`dispose`,E),te(t),t.isVideoTexture&&f.delete(t),t.isHTMLTexture&&p.delete(t)}function D(e){let t=e.target;t.removeEventListener(`dispose`,D),k(t)}function te(e){let t=a.get(e);if(t.__webglInit===void 0)return;let n=e.source,r=h.get(n);if(r){let i=r[t.__cacheKey];i.usedTimes--,i.usedTimes===0&&ne(e),Object.keys(r).length===0&&h.delete(n)}a.remove(e)}function ne(e){let t=a.get(e);n.deleteTexture(t.__webglTexture);let r=e.source,i=h.get(r);delete i[t.__cacheKey],c.memory.textures--}function k(e){let t=a.get(e);if(e.depthTexture&&(e.depthTexture.dispose(),a.remove(e.depthTexture)),e.isWebGLCubeRenderTarget)for(let e=0;e<6;e++){if(Array.isArray(t.__webglFramebuffer[e]))for(let r=0;r<t.__webglFramebuffer[e].length;r++)n.deleteFramebuffer(t.__webglFramebuffer[e][r]);else n.deleteFramebuffer(t.__webglFramebuffer[e]);t.__webglDepthbuffer&&n.deleteRenderbuffer(t.__webglDepthbuffer[e])}else{if(Array.isArray(t.__webglFramebuffer))for(let e=0;e<t.__webglFramebuffer.length;e++)n.deleteFramebuffer(t.__webglFramebuffer[e]);else n.deleteFramebuffer(t.__webglFramebuffer);if(t.__webglDepthbuffer&&n.deleteRenderbuffer(t.__webglDepthbuffer),t.__webglMultisampledFramebuffer&&n.deleteFramebuffer(t.__webglMultisampledFramebuffer),t.__webglColorRenderbuffer)for(let e=0;e<t.__webglColorRenderbuffer.length;e++)t.__webglColorRenderbuffer[e]&&n.deleteRenderbuffer(t.__webglColorRenderbuffer[e]);t.__webglDepthRenderbuffer&&n.deleteRenderbuffer(t.__webglDepthRenderbuffer)}let r=e.textures;for(let e=0,t=r.length;e<t;e++){let t=a.get(r[e]);t.__webglTexture&&(n.deleteTexture(t.__webglTexture),c.memory.textures--),a.remove(r[e])}a.remove(e)}let A=0;function j(){A=0}function re(){return A}function ie(e){A=e}function ae(){let e=A;return e>=o.maxTextures&&I(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+o.maxTextures),A+=1,e}function M(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function oe(e,t){let r=a.get(e);if(e.isVideoTexture&&Ee(e),e.isRenderTargetTexture===!1&&e.isExternalTexture!==!0&&e.version>0&&r.__version!==e.version){let n=e.image;if(n===null)I(`WebGLRenderer: Texture marked for update but no image data found.`);else if(n.complete===!1)I(`WebGLRenderer: Texture marked for update but image is incomplete`);else{z(r,e,t);return}}else e.isExternalTexture&&(r.__webglTexture=e.sourceTexture?e.sourceTexture:null);i.bindTexture(n.TEXTURE_2D,r.__webglTexture,n.TEXTURE0+t)}function P(e,t){let r=a.get(e);e.isRenderTargetTexture===!1&&e.version>0&&r.__version!==e.version?z(r,e,t):(e.isExternalTexture&&(r.__webglTexture=e.sourceTexture?e.sourceTexture:null),i.bindTexture(n.TEXTURE_2D_ARRAY,r.__webglTexture,n.TEXTURE0+t))}function se(e,t){let r=a.get(e);e.isRenderTargetTexture===!1&&e.version>0&&r.__version!==e.version?z(r,e,t):i.bindTexture(n.TEXTURE_3D,r.__webglTexture,n.TEXTURE0+t)}function ce(e,t){let r=a.get(e);e.isCubeDepthTexture!==!0&&e.version>0&&r.__version!==e.version?pe(r,e,t):i.bindTexture(n.TEXTURE_CUBE_MAP,r.__webglTexture,n.TEXTURE0+t)}let le={[Re]:n.REPEAT,[qe]:n.CLAMP_TO_EDGE,[be]:n.MIRRORED_REPEAT},ue={[K]:n.NEAREST,[we]:n.NEAREST_MIPMAP_NEAREST,[W]:n.NEAREST_MIPMAP_LINEAR,[O]:n.LINEAR,[ve]:n.LINEAR_MIPMAP_NEAREST,[e]:n.LINEAR_MIPMAP_LINEAR},de={512:n.NEVER,519:n.ALWAYS,513:n.LESS,515:n.LEQUAL,514:n.EQUAL,518:n.GEQUAL,516:n.GREATER,517:n.NOTEQUAL};function F(e,t){if(t.type===1015&&r.has(`OES_texture_float_linear`)===!1&&(t.magFilter===1006||t.magFilter===1007||t.magFilter===1005||t.magFilter===1008||t.minFilter===1006||t.minFilter===1007||t.minFilter===1005||t.minFilter===1008)&&I(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),n.texParameteri(e,n.TEXTURE_WRAP_S,le[t.wrapS]),n.texParameteri(e,n.TEXTURE_WRAP_T,le[t.wrapT]),(e===n.TEXTURE_3D||e===n.TEXTURE_2D_ARRAY)&&n.texParameteri(e,n.TEXTURE_WRAP_R,le[t.wrapR]),n.texParameteri(e,n.TEXTURE_MAG_FILTER,ue[t.magFilter]),n.texParameteri(e,n.TEXTURE_MIN_FILTER,ue[t.minFilter]),t.compareFunction&&(n.texParameteri(e,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(e,n.TEXTURE_COMPARE_FUNC,de[t.compareFunction])),r.has(`EXT_texture_filter_anisotropic`)===!0){if(t.magFilter===1003||t.minFilter!==1005&&t.minFilter!==1008||t.type===1015&&r.has(`OES_texture_float_linear`)===!1)return;if(t.anisotropy>1||a.get(t).__currentAnisotropy){let i=r.get(`EXT_texture_filter_anisotropic`);n.texParameterf(e,i.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(t.anisotropy,o.getMaxAnisotropy())),a.get(t).__currentAnisotropy=t.anisotropy}}}function L(e,t){let r=!1;e.__webglInit===void 0&&(e.__webglInit=!0,t.addEventListener(`dispose`,E));let i=t.source,a=h.get(i);a===void 0&&(a={},h.set(i,a));let o=M(t);if(o!==e.__cacheKey){a[o]===void 0&&(a[o]={texture:n.createTexture(),usedTimes:0},c.memory.textures++,r=!0),a[o].usedTimes++;let i=a[e.__cacheKey];i!==void 0&&(a[e.__cacheKey].usedTimes--,i.usedTimes===0&&ne(t)),e.__cacheKey=o,e.__webglTexture=a[o].texture}return r}function R(e,t,n){return Math.floor(Math.floor(e/n)/t)}function fe(e,t,r,a){let o=e.updateRanges;if(o.length===0)i.texSubImage2D(n.TEXTURE_2D,0,0,0,t.width,t.height,r,a,t.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let n=o[s],r=o[e],i=n.start+n.count,a=R(r.start,t.width,4),c=R(n.start,t.width,4);r.start<=i+1&&a===c&&R(r.start+r.count-1,t.width,4)===a?n.count=Math.max(n.count,r.start+r.count-n.start):(++s,o[s]=r)}o.length=s+1;let c=i.getParameter(n.UNPACK_ROW_LENGTH),l=i.getParameter(n.UNPACK_SKIP_PIXELS),u=i.getParameter(n.UNPACK_SKIP_ROWS);i.pixelStorei(n.UNPACK_ROW_LENGTH,t.width);for(let e=0,s=o.length;e<s;e++){let s=o[e],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%t.width,d=Math.floor(c/t.width),f=l;i.pixelStorei(n.UNPACK_SKIP_PIXELS,u),i.pixelStorei(n.UNPACK_SKIP_ROWS,d),i.texSubImage2D(n.TEXTURE_2D,0,u,d,f,1,r,a,t.data)}e.clearUpdateRanges(),i.pixelStorei(n.UNPACK_ROW_LENGTH,c),i.pixelStorei(n.UNPACK_SKIP_PIXELS,l),i.pixelStorei(n.UNPACK_SKIP_ROWS,u)}}function z(e,t,r){let c=n.TEXTURE_2D;(t.isDataArrayTexture||t.isCompressedArrayTexture)&&(c=n.TEXTURE_2D_ARRAY),t.isData3DTexture&&(c=n.TEXTURE_3D);let l=L(e,t),u=t.source;i.bindTexture(c,e.__webglTexture,n.TEXTURE0+r);let d=a.get(u);if(u.version!==d.__version||l===!0){if(i.activeTexture(n.TEXTURE0+r),!(typeof ImageBitmap<`u`&&t.image instanceof ImageBitmap)){let e=Y.getPrimaries(Y.workingColorSpace),r=t.colorSpace===``?null:Y.getPrimaries(t.colorSpace),a=t.colorSpace===``||e===r?n.NONE:n.BROWSER_DEFAULT_WEBGL;i.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,t.flipY),i.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),i.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,a)}i.pixelStorei(n.UNPACK_ALIGNMENT,t.unpackAlignment);let e=v(t.image,!1,o.maxTextureSize);e=De(t,e);let a=s.convert(t.format,t.colorSpace),f=s.convert(t.type),m=C(t.internalFormat,a,f,t.normalized,t.colorSpace,t.isVideoTexture);F(c,t);let h,g=t.mipmaps,_=t.isVideoTexture!==!0,S=d.__version===void 0||l===!0,E=u.dataReady,D=T(t,e);if(t.isDepthTexture)m=w(t.format===x,t.type),S&&(_?i.texStorage2D(n.TEXTURE_2D,1,m,e.width,e.height):i.texImage2D(n.TEXTURE_2D,0,m,e.width,e.height,0,a,f,null));else if(t.isDataTexture){if(g.length>0){_&&S&&i.texStorage2D(n.TEXTURE_2D,D,m,g[0].width,g[0].height);for(let e=0,t=g.length;e<t;e++)h=g[e],_?E&&i.texSubImage2D(n.TEXTURE_2D,e,0,0,h.width,h.height,a,f,h.data):i.texImage2D(n.TEXTURE_2D,e,m,h.width,h.height,0,a,f,h.data);t.generateMipmaps=!1}else _?(S&&i.texStorage2D(n.TEXTURE_2D,D,m,e.width,e.height),E&&fe(t,e,a,f)):i.texImage2D(n.TEXTURE_2D,0,m,e.width,e.height,0,a,f,e.data)}else if(t.isCompressedTexture){if(t.isCompressedArrayTexture){_&&S&&i.texStorage3D(n.TEXTURE_2D_ARRAY,D,m,g[0].width,g[0].height,e.depth);for(let r=0,o=g.length;r<o;r++)if(h=g[r],t.format!==1023){if(a!==null){if(_){if(E){if(t.layerUpdates.size>0){let e=_e(h.width,h.height,t.format,t.type);for(let o of t.layerUpdates){let t=h.data.subarray(o*e/h.data.BYTES_PER_ELEMENT,(o+1)*e/h.data.BYTES_PER_ELEMENT);i.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,r,0,0,o,h.width,h.height,1,a,t)}}else i.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,r,0,0,0,h.width,h.height,e.depth,a,h.data)}}else i.compressedTexImage3D(n.TEXTURE_2D_ARRAY,r,m,h.width,h.height,e.depth,0,h.data,0,0)}else I(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else _?E&&i.texSubImage3D(n.TEXTURE_2D_ARRAY,r,0,0,0,h.width,h.height,e.depth,a,f,h.data):i.texImage3D(n.TEXTURE_2D_ARRAY,r,m,h.width,h.height,e.depth,0,a,f,h.data);t.layerUpdates.size>0&&t.clearLayerUpdates()}else{_&&S&&i.texStorage2D(n.TEXTURE_2D,D,m,g[0].width,g[0].height);for(let e=0,r=g.length;e<r;e++)h=g[e],t.format===1023?_?E&&i.texSubImage2D(n.TEXTURE_2D,e,0,0,h.width,h.height,a,f,h.data):i.texImage2D(n.TEXTURE_2D,e,m,h.width,h.height,0,a,f,h.data):a===null?I(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):_?E&&i.compressedTexSubImage2D(n.TEXTURE_2D,e,0,0,h.width,h.height,a,h.data):i.compressedTexImage2D(n.TEXTURE_2D,e,m,h.width,h.height,0,h.data)}}else if(t.isDataArrayTexture){if(_){if(S&&i.texStorage3D(n.TEXTURE_2D_ARRAY,D,m,e.width,e.height,e.depth),E){if(t.layerUpdates.size>0){let r=_e(e.width,e.height,t.format,t.type);for(let o of t.layerUpdates){let t=e.data.subarray(o*r/e.data.BYTES_PER_ELEMENT,(o+1)*r/e.data.BYTES_PER_ELEMENT);i.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,o,e.width,e.height,1,a,f,t)}t.clearLayerUpdates()}else i.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,e.width,e.height,e.depth,a,f,e.data)}}else i.texImage3D(n.TEXTURE_2D_ARRAY,0,m,e.width,e.height,e.depth,0,a,f,e.data)}else if(t.isData3DTexture)_?(S&&i.texStorage3D(n.TEXTURE_3D,D,m,e.width,e.height,e.depth),E&&i.texSubImage3D(n.TEXTURE_3D,0,0,0,0,e.width,e.height,e.depth,a,f,e.data)):i.texImage3D(n.TEXTURE_3D,0,m,e.width,e.height,e.depth,0,a,f,e.data);else if(t.isFramebufferTexture){if(S){if(_)i.texStorage2D(n.TEXTURE_2D,D,m,e.width,e.height);else{let t=e.width,r=e.height;for(let e=0;e<D;e++)i.texImage2D(n.TEXTURE_2D,e,m,t,r,0,a,f,null),t>>=1,r>>=1}}}else if(t.isHTMLTexture){if(`texElementImage2D`in n){let r=n.canvas;if(r.hasAttribute(`layoutsubtree`)||r.setAttribute(`layoutsubtree`,`true`),e.parentNode!==r){r.appendChild(e),p.add(t),r.onpaint=e=>{let t=e.changedElements;for(let e of p)t.includes(e.image)&&(e.needsUpdate=!0)},r.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,e);else{let t=n.RGBA,r=n.RGBA,i=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,t,r,i,e)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(g.length>0){if(_&&S){let e=Oe(g[0]);i.texStorage2D(n.TEXTURE_2D,D,m,e.width,e.height)}for(let e=0,t=g.length;e<t;e++)h=g[e],_?E&&i.texSubImage2D(n.TEXTURE_2D,e,0,0,a,f,h):i.texImage2D(n.TEXTURE_2D,e,m,a,f,h);t.generateMipmaps=!1}else if(_){if(S){let t=Oe(e);i.texStorage2D(n.TEXTURE_2D,D,m,t.width,t.height)}E&&i.texSubImage2D(n.TEXTURE_2D,0,0,0,a,f,e)}else i.texImage2D(n.TEXTURE_2D,0,m,a,f,e);y(t)&&b(c),d.__version=u.version,t.onUpdate&&t.onUpdate(t)}e.__version=t.version}function pe(e,t,r){if(t.image.length!==6)return;let c=L(e,t),l=t.source;i.bindTexture(n.TEXTURE_CUBE_MAP,e.__webglTexture,n.TEXTURE0+r);let u=a.get(l);if(l.version!==u.__version||c===!0){i.activeTexture(n.TEXTURE0+r);let e=Y.getPrimaries(Y.workingColorSpace),a=t.colorSpace===``?null:Y.getPrimaries(t.colorSpace),d=t.colorSpace===``||e===a?n.NONE:n.BROWSER_DEFAULT_WEBGL;i.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,t.flipY),i.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),i.pixelStorei(n.UNPACK_ALIGNMENT,t.unpackAlignment),i.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=t.isCompressedTexture||t.image[0].isCompressedTexture,p=t.image[0]&&t.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=v(t.image[e],!0,o.maxCubemapSize):m[e]=p?t.image[e].image:t.image[e],m[e]=De(t,m[e]);let h=m[0],g=s.convert(t.format,t.colorSpace),_=s.convert(t.type),x=C(t.internalFormat,g,_,t.normalized,t.colorSpace),S=t.isVideoTexture!==!0,w=u.__version===void 0||c===!0,E=l.dataReady,D=T(t,h);F(n.TEXTURE_CUBE_MAP,t);let O;if(f){S&&w&&i.texStorage2D(n.TEXTURE_CUBE_MAP,D,x,h.width,h.height);for(let e=0;e<6;e++){O=m[e].mipmaps;for(let r=0;r<O.length;r++){let a=O[r];t.format===1023?S?E&&i.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,r,0,0,a.width,a.height,g,_,a.data):i.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,r,x,a.width,a.height,0,g,_,a.data):g===null?I(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):S?E&&i.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,r,0,0,a.width,a.height,g,a.data):i.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,r,x,a.width,a.height,0,a.data)}}}else{if(O=t.mipmaps,S&&w){O.length>0&&D++;let e=Oe(m[0]);i.texStorage2D(n.TEXTURE_CUBE_MAP,D,x,e.width,e.height)}for(let e=0;e<6;e++)if(p){S?E&&i.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,m[e].width,m[e].height,g,_,m[e].data):i.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,x,m[e].width,m[e].height,0,g,_,m[e].data);for(let t=0;t<O.length;t++){let r=O[t].image[e].image;S?E&&i.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,r.width,r.height,g,_,r.data):i.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,x,r.width,r.height,0,g,_,r.data)}}else{S?E&&i.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,g,_,m[e]):i.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,x,g,_,m[e]);for(let t=0;t<O.length;t++){let r=O[t];S?E&&i.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,g,_,r.image[e]):i.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,x,g,_,r.image[e])}}}y(t)&&b(n.TEXTURE_CUBE_MAP),u.__version=l.version,t.onUpdate&&t.onUpdate(t)}e.__version=t.version}function me(e,t,r,o,c,u){let d=s.convert(r.format,r.colorSpace),f=s.convert(r.type),p=C(r.internalFormat,d,f,r.normalized,r.colorSpace),m=a.get(t),h=a.get(r);if(h.__renderTarget=t,!m.__hasExternalTextures){let e=Math.max(1,t.width>>u),r=Math.max(1,t.height>>u);c===n.TEXTURE_3D||c===n.TEXTURE_2D_ARRAY?i.texImage3D(c,u,p,e,r,t.depth,0,d,f,null):i.texImage2D(c,u,p,e,r,0,d,f,null)}i.bindFramebuffer(n.FRAMEBUFFER,e),U(t)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,o,c,h.__webglTexture,0,Te(t)):(c===n.TEXTURE_2D||c>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&c<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,o,c,h.__webglTexture,u),i.bindFramebuffer(n.FRAMEBUFFER,null)}function he(e,t,r){if(n.bindRenderbuffer(n.RENDERBUFFER,e),t.depthBuffer){let i=t.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=w(t.stencilBuffer,a),s=t.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;U(t)?l.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Te(t),o,t.width,t.height):r?n.renderbufferStorageMultisample(n.RENDERBUFFER,Te(t),o,t.width,t.height):n.renderbufferStorage(n.RENDERBUFFER,o,t.width,t.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,s,n.RENDERBUFFER,e)}else{let e=t.textures;for(let i=0;i<e.length;i++){let a=e[i],o=s.convert(a.format,a.colorSpace),c=s.convert(a.type),u=C(a.internalFormat,o,c,a.normalized,a.colorSpace);U(t)?l.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Te(t),u,t.width,t.height):r?n.renderbufferStorageMultisample(n.RENDERBUFFER,Te(t),u,t.width,t.height):n.renderbufferStorage(n.RENDERBUFFER,u,t.width,t.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function B(e,t,r){let o=t.isWebGLCubeRenderTarget===!0;if(i.bindFramebuffer(n.FRAMEBUFFER,e),!(t.depthTexture&&t.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let c=a.get(t.depthTexture);if(c.__renderTarget=t,(!c.__webglTexture||t.depthTexture.image.width!==t.width||t.depthTexture.image.height!==t.height)&&(t.depthTexture.image.width=t.width,t.depthTexture.image.height=t.height,t.depthTexture.needsUpdate=!0),o){if(c.__webglInit===void 0&&(c.__webglInit=!0,t.depthTexture.addEventListener(`dispose`,E)),c.__webglTexture===void 0){c.__webglTexture=n.createTexture(),i.bindTexture(n.TEXTURE_CUBE_MAP,c.__webglTexture),F(n.TEXTURE_CUBE_MAP,t.depthTexture);let e=s.convert(t.depthTexture.format),r=s.convert(t.depthTexture.type),a;t.depthTexture.format===1026?a=n.DEPTH_COMPONENT24:t.depthTexture.format===1027&&(a=n.DEPTH24_STENCIL8);for(let i=0;i<6;i++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,a,t.width,t.height,0,e,r,null)}}else oe(t.depthTexture,0);let u=c.__webglTexture,d=Te(t),f=o?n.TEXTURE_CUBE_MAP_POSITIVE_X+r:n.TEXTURE_2D,p=t.depthTexture.format===1027?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(t.depthTexture.format===1026)U(t)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,p,f,u,0,d):n.framebufferTexture2D(n.FRAMEBUFFER,p,f,u,0);else if(t.depthTexture.format===1027)U(t)?l.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,p,f,u,0,d):n.framebufferTexture2D(n.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function ge(e){let t=a.get(e),r=e.isWebGLCubeRenderTarget===!0;if(t.__boundDepthTexture!==e.depthTexture){let n=e.depthTexture;if(t.__depthDisposeCallback&&t.__depthDisposeCallback(),n){let e=()=>{delete t.__boundDepthTexture,delete t.__depthDisposeCallback,n.removeEventListener(`dispose`,e)};n.addEventListener(`dispose`,e),t.__depthDisposeCallback=e}t.__boundDepthTexture=n}if(e.depthTexture&&!t.__autoAllocateDepthBuffer){if(r)for(let n=0;n<6;n++)B(t.__webglFramebuffer[n],e,n);else{let n=e.texture.mipmaps;n&&n.length>0?B(t.__webglFramebuffer[0],e,0):B(t.__webglFramebuffer,e,0)}}else if(r){t.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(i.bindFramebuffer(n.FRAMEBUFFER,t.__webglFramebuffer[r]),t.__webglDepthbuffer[r]===void 0)t.__webglDepthbuffer[r]=n.createRenderbuffer(),he(t.__webglDepthbuffer[r],e,!1);else{let i=e.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,a=t.__webglDepthbuffer[r];n.bindRenderbuffer(n.RENDERBUFFER,a),n.framebufferRenderbuffer(n.FRAMEBUFFER,i,n.RENDERBUFFER,a)}}else{let r=e.texture.mipmaps;if(r&&r.length>0?i.bindFramebuffer(n.FRAMEBUFFER,t.__webglFramebuffer[0]):i.bindFramebuffer(n.FRAMEBUFFER,t.__webglFramebuffer),t.__webglDepthbuffer===void 0)t.__webglDepthbuffer=n.createRenderbuffer(),he(t.__webglDepthbuffer,e,!1);else{let r=e.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,i=t.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,i),n.framebufferRenderbuffer(n.FRAMEBUFFER,r,n.RENDERBUFFER,i)}}i.bindFramebuffer(n.FRAMEBUFFER,null)}function V(e,t,r){let i=a.get(e);t!==void 0&&me(i.__webglFramebuffer,e,e.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),r!==void 0&&ge(e)}function ye(e){let t=e.texture,r=a.get(e),o=a.get(t);e.addEventListener(`dispose`,D);let l=e.textures,u=e.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(o.__webglTexture===void 0&&(o.__webglTexture=n.createTexture()),o.__version=t.version,c.memory.textures++),u){r.__webglFramebuffer=[];for(let e=0;e<6;e++)if(t.mipmaps&&t.mipmaps.length>0){r.__webglFramebuffer[e]=[];for(let i=0;i<t.mipmaps.length;i++)r.__webglFramebuffer[e][i]=n.createFramebuffer()}else r.__webglFramebuffer[e]=n.createFramebuffer()}else{if(t.mipmaps&&t.mipmaps.length>0){r.__webglFramebuffer=[];for(let e=0;e<t.mipmaps.length;e++)r.__webglFramebuffer[e]=n.createFramebuffer()}else r.__webglFramebuffer=n.createFramebuffer();if(d)for(let e=0,t=l.length;e<t;e++){let t=a.get(l[e]);t.__webglTexture===void 0&&(t.__webglTexture=n.createTexture(),c.memory.textures++)}if(e.samples>0&&U(e)===!1){r.__webglMultisampledFramebuffer=n.createFramebuffer(),r.__webglColorRenderbuffer=[],i.bindFramebuffer(n.FRAMEBUFFER,r.__webglMultisampledFramebuffer);for(let t=0;t<l.length;t++){let i=l[t];r.__webglColorRenderbuffer[t]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,r.__webglColorRenderbuffer[t]);let a=s.convert(i.format,i.colorSpace),o=s.convert(i.type),c=C(i.internalFormat,a,o,i.normalized,i.colorSpace,e.isXRRenderTarget===!0),u=Te(e);n.renderbufferStorageMultisample(n.RENDERBUFFER,u,c,e.width,e.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+t,n.RENDERBUFFER,r.__webglColorRenderbuffer[t])}n.bindRenderbuffer(n.RENDERBUFFER,null),e.depthBuffer&&(r.__webglDepthRenderbuffer=n.createRenderbuffer(),he(r.__webglDepthRenderbuffer,e,!0)),i.bindFramebuffer(n.FRAMEBUFFER,null)}}if(u){i.bindTexture(n.TEXTURE_CUBE_MAP,o.__webglTexture),F(n.TEXTURE_CUBE_MAP,t);for(let i=0;i<6;i++)if(t.mipmaps&&t.mipmaps.length>0)for(let a=0;a<t.mipmaps.length;a++)me(r.__webglFramebuffer[i][a],e,t,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+i,a);else me(r.__webglFramebuffer[i],e,t,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+i,0);y(t)&&b(n.TEXTURE_CUBE_MAP),i.unbindTexture()}else if(d){for(let t=0,o=l.length;t<o;t++){let o=l[t],s=a.get(o),c=n.TEXTURE_2D;(e.isWebGL3DRenderTarget||e.isWebGLArrayRenderTarget)&&(c=e.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),i.bindTexture(c,s.__webglTexture),F(c,o),me(r.__webglFramebuffer,e,o,n.COLOR_ATTACHMENT0+t,c,0),y(o)&&b(c)}i.unbindTexture()}else{let a=n.TEXTURE_2D;if((e.isWebGL3DRenderTarget||e.isWebGLArrayRenderTarget)&&(a=e.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),i.bindTexture(a,o.__webglTexture),F(a,t),t.mipmaps&&t.mipmaps.length>0)for(let i=0;i<t.mipmaps.length;i++)me(r.__webglFramebuffer[i],e,t,n.COLOR_ATTACHMENT0,a,i);else me(r.__webglFramebuffer,e,t,n.COLOR_ATTACHMENT0,a,0);y(t)&&b(a),i.unbindTexture()}e.depthBuffer&&ge(e)}function xe(e){let t=e.textures;for(let n=0,r=t.length;n<r;n++){let r=t[n];if(y(r)){let t=S(e),n=a.get(r).__webglTexture;i.bindTexture(t,n),b(t),i.unbindTexture()}}}let Se=[],Ce=[];function H(e){if(e.samples>0){if(U(e)===!1){let t=e.textures,r=e.width,o=e.height,s=n.COLOR_BUFFER_BIT,c=e.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,l=a.get(e),d=t.length>1;if(d)for(let e=0;e<t.length;e++)i.bindFramebuffer(n.FRAMEBUFFER,l.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+e,n.RENDERBUFFER,null),i.bindFramebuffer(n.FRAMEBUFFER,l.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+e,n.TEXTURE_2D,null,0);i.bindFramebuffer(n.READ_FRAMEBUFFER,l.__webglMultisampledFramebuffer);let f=e.texture.mipmaps;f&&f.length>0?i.bindFramebuffer(n.DRAW_FRAMEBUFFER,l.__webglFramebuffer[0]):i.bindFramebuffer(n.DRAW_FRAMEBUFFER,l.__webglFramebuffer);for(let i=0;i<t.length;i++){if(e.resolveDepthBuffer&&(e.depthBuffer&&(s|=n.DEPTH_BUFFER_BIT),e.stencilBuffer&&e.resolveStencilBuffer&&(s|=n.STENCIL_BUFFER_BIT)),d){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,l.__webglColorRenderbuffer[i]);let e=a.get(t[i]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,e,0)}n.blitFramebuffer(0,0,r,o,0,0,r,o,s,n.NEAREST),u===!0&&(Se.length=0,Ce.length=0,Se.push(n.COLOR_ATTACHMENT0+i),e.depthBuffer&&e.storeMultisampledDepthBuffer===!1&&(Se.push(c),Ce.push(c),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,Ce)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Se))}if(i.bindFramebuffer(n.READ_FRAMEBUFFER,null),i.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),d)for(let e=0;e<t.length;e++){i.bindFramebuffer(n.FRAMEBUFFER,l.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+e,n.RENDERBUFFER,l.__webglColorRenderbuffer[e]);let r=a.get(t[e]).__webglTexture;i.bindFramebuffer(n.FRAMEBUFFER,l.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+e,n.TEXTURE_2D,r,0)}i.bindFramebuffer(n.DRAW_FRAMEBUFFER,l.__webglMultisampledFramebuffer)}else if(e.depthBuffer&&e.storeMultisampledDepthBuffer===!1&&u){let t=e.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[t])}}}function Te(e){return Math.min(o.maxSamples,e.samples)}function U(e){let t=a.get(e);return e.samples>0&&r.has(`WEBGL_multisampled_render_to_texture`)===!0&&t.__useRenderToTexture!==!1}function Ee(e){let t=c.render.frame;f.get(e)!==t&&(f.set(e,t),e.update())}function De(e,n){let r=e.colorSpace,i=e.format,a=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||r!==`srgb-linear`&&r!==``&&(Y.getTransfer(r)===`srgb`?(i!==1023||a!==1009)&&I(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):t(`WebGLTextures: Unsupported texture color space:`,r)),n}function Oe(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(d.width=e.naturalWidth||e.width,d.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(d.width=e.displayWidth,d.height=e.displayHeight):(d.width=e.width,d.height=e.height),d}this.allocateTextureUnit=ae,this.resetTextureUnits=j,this.getTextureUnits=re,this.setTextureUnits=ie,this.setTexture2D=oe,this.setTexture2DArray=P,this.setTexture3D=se,this.setTextureCube=ce,this.rebindTextures=V,this.setupRenderTarget=ye,this.updateRenderTargetMipmap=xe,this.updateMultisampleRenderTarget=H,this.setupDepthRenderbuffer=ge,this.setupFrameBufferTexture=me,this.useMultisampledRTT=U,this.isReversedDepthBuffer=function(){return i.buffers.depth.getReversed()}}function oi(e,t){function n(n,r=``){let i,a=Y.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var si=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,ci=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,li=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new te(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new A({vertexShader:si,fragmentShader:ci,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new J(new z(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},ui=class extends b{constructor(e,t){super();let n=this,r=null,i=1,o=null,s=`local-floor`,c=1,l=null,u=null,d=null,p=null,m=null,h=null,v=typeof XRWebGLBinding<`u`,b=new li,S={},w=t.getContextAttributes(),T=null,E=null,D=[],O=[],ee=new N,k=null,A=null,j=new Je;j.viewport=new y;let ie=new Je;ie.viewport=new y;let ae=[j,ie],M=new pe,oe=null,P=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=D[e];return t===void 0&&(t=new ce,D[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=D[e];return t===void 0&&(t=new ce,D[e]=t),t.getGripSpace()},this.getHand=function(e){let t=D[e];return t===void 0&&(t=new ce,D[e]=t),t.getHandSpace()};function se(e){let t=O.indexOf(e.inputSource);if(t===-1)return;let n=D[t];n!==void 0&&(n.update(e.inputSource,e.frame,l||o),n.dispatchEvent({type:e.type,data:e.inputSource}))}function le(){r.removeEventListener(`select`,se),r.removeEventListener(`selectstart`,se),r.removeEventListener(`selectend`,se),r.removeEventListener(`squeeze`,se),r.removeEventListener(`squeezestart`,se),r.removeEventListener(`squeezeend`,se),r.removeEventListener(`end`,le),r.removeEventListener(`inputsourceschange`,ue);for(let e=0;e<D.length;e++){let t=O[e];t!==null&&(O[e]=null,D[e].disconnect(t))}oe=null,P=null,b.reset();for(let e in S)delete S[e];if(e.setRenderTarget(T),m=null,p=null,d=null,r=null,E=null,he.stop(),n.isPresenting=!1,e.setPixelRatio(k),e.setSize(ee.width,ee.height,!1),A!==null){let e=A.camera;e.fov=A.fov,e.zoom=A.zoom,e.updateProjectionMatrix(),A=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&I(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){s=e,n.isPresenting===!0&&I(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(e){l=e},this.getBaseLayer=function(){return p===null?m:p},this.getBinding=function(){return d===null&&v&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return h},this.getSession=function(){return r},this.setSession=async function(u){if(r=u,r!==null){if(T=e.getRenderTarget(),r.addEventListener(`select`,se),r.addEventListener(`selectstart`,se),r.addEventListener(`selectend`,se),r.addEventListener(`squeeze`,se),r.addEventListener(`squeezestart`,se),r.addEventListener(`squeezeend`,se),r.addEventListener(`end`,le),r.addEventListener(`inputsourceschange`,ue),w.xrCompatible!==!0&&await t.makeXRCompatible(),k=e.getPixelRatio(),e.getSize(ee),v&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,o=null,s=null;w.depth&&(s=w.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=w.stencil?x:Ee,o=w.stencil?ne:a);let c={colorFormat:t.RGBA8,depthFormat:s,scaleFactor:i};d=this.getBinding(),p=d.createProjectionLayer(c),r.updateRenderState({layers:[p]}),e.setPixelRatio(1),e.setSize(p.textureWidth,p.textureHeight,!1),E=new _(p.textureWidth,p.textureHeight,{format:Ae,type:g,depthTexture:new C(p.textureWidth,p.textureHeight,o,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:w.stencil,colorSpace:e.outputColorSpace,samples:w.antialias?4:0,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1,storeMultisampledDepthBuffer:p.ignoreDepthValues===!1,storeMultisampledStencilBuffer:p.ignoreDepthValues===!1})}else{let n={antialias:w.antialias,alpha:!0,depth:w.depth,stencil:w.stencil,framebufferScaleFactor:i};m=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:m}),e.setPixelRatio(1),e.setSize(m.framebufferWidth,m.framebufferHeight,!1),E=new _(m.framebufferWidth,m.framebufferHeight,{format:Ae,type:g,colorSpace:e.outputColorSpace,stencilBuffer:w.stencil,resolveDepthBuffer:m.ignoreDepthValues===!1,resolveStencilBuffer:m.ignoreDepthValues===!1,storeMultisampledDepthBuffer:m.ignoreDepthValues===!1,storeMultisampledStencilBuffer:m.ignoreDepthValues===!1})}E.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await r.requestReferenceSpace(s),he.setContext(r),he.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return b.getDepthTexture()};function ue(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=O.indexOf(n);r>=0&&(O[r]=null,D[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=O.indexOf(n);if(r===-1){for(let e=0;e<D.length;e++)if(e>=O.length){O.push(n),r=e;break}else if(O[e]===null){O[e]=n,r=e;break}if(r===-1)break}let i=D[r];i&&i.connect(n)}}let de=new f,F=new f;function L(e,t,n){de.setFromMatrixPosition(t.matrixWorld),F.setFromMatrixPosition(n.matrixWorld);let r=de.distanceTo(F),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function R(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;b.texture!==null&&(b.depthNear>0&&(t=b.depthNear),b.depthFar>0&&(n=b.depthFar)),M.near=ie.near=j.near=t,M.far=ie.far=j.far=n,(oe!==M.near||P!==M.far)&&(r.updateRenderState({depthNear:M.near,depthFar:M.far}),oe=M.near,P=M.far),M.layers.mask=e.layers.mask|6,j.layers.mask=M.layers.mask&-5,ie.layers.mask=M.layers.mask&-3;let i=e.parent,a=M.cameras;R(M,i);for(let e=0;e<a.length;e++)R(a[e],i);a.length===2?L(M,j,ie):M.projectionMatrix.copy(j.projectionMatrix),A===null&&e.isPerspectiveCamera&&(A={camera:e,fov:e.fov,zoom:e.zoom}),fe(e,M,i)};function fe(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=re*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return M},this.getFoveation=function(){if(p!==null||m!==null)return c},this.setFoveation=function(e){c=e,p!==null&&(p.fixedFoveation=e),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=e)},this.hasDepthSensing=function(){return b.texture!==null},this.getDepthSensingMesh=function(){return b.getMesh(M)},this.getCameraTexture=function(e){return S[e]};let z=null;function me(t,i){if(u=i.getViewerPose(l||o),h=i,u!==null){let t=u.views;m!==null&&(e.setRenderTargetFramebuffer(E,m.framebuffer),e.setRenderTarget(E));let i=!1;t.length!==M.cameras.length&&(M.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(m!==null)a=m.getViewport(r);else{let t=d.getViewSubImage(p,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(E,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(E))}let o=ae[n];o===void 0&&(o=new Je,o.layers.enable(n),o.viewport=new y,ae[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(M.matrix.copy(o.matrix),M.matrix.decompose(M.position,M.quaternion,M.scale)),i===!0&&M.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&v){d=n.getBinding();let e=d.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&b.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&v){e.state.unbindTexture(),d=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=S[n];e||(e=new te,S[n]=e);let t=d.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<D.length;e++){let t=O[e],n=D[e];t!==null&&n!==void 0&&n.update(t,i,l||o)}z&&z(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),h=null}let he=new tt;he.setAnimationLoop(me),this.setAnimationLoop=function(e){z=e},this.dispose=function(){}}},di=new Le,fi=new L;fi.set(-1,0,0,0,1,0,0,0,1);function pi(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,We(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(di.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(fi),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function mi(e,n,r,i){let a={},o={},s=[],c=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function l(e,t){let n=t.program;i.uniformBlockBinding(e,n)}function u(e,t){let r=a[e.id];r===void 0&&(_(e),r=d(e),a[e.id]=r,e.addEventListener(`dispose`,y));let s=t.program;i.updateUBOMapping(e,s);let c=n.render.frame;o[e.id]!==c&&(p(e),o[e.id]=c)}function d(t){let n=f();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function f(){for(let e=0;e<c;e++)if(s.indexOf(e)===-1)return s.push(e),e;return t(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function p(t){let n=a[t.id],r=t.uniforms,i=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)m(t[n],e,n,i);else m(t,e,0,i)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function m(t,n,r,i){if(g(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=v(i);h(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else h(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function h(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function g(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:ArrayBuffer.isView(i)?i.slice():i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function _(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=v(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function v(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?I(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):I(`WebGLRenderer: Unsupported uniform value type.`,e),t}function y(t){let n=t.target;n.removeEventListener(`dispose`,y);let r=s.indexOf(n.__bindingPointIndex);s.splice(r,1),e.deleteBuffer(a[n.id]),delete a[n.id],delete o[n.id]}function b(){for(let t in a)e.deleteBuffer(a[t]);s=[],a={},o={}}return{bind:l,update:u,dispose:b}}var hi=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),gi=null;function _i(){return gi===null&&(gi=new n(hi,16,16,Fe,d),gi.name=`DFG_LUT`,gi.minFilter=O,gi.magFilter=O,gi.wrapS=qe,gi.wrapT=qe,gi.generateMipmaps=!1,gi.needsUpdate=!0),gi}var vi=class{constructor(n={}){let{canvas:i=ue(),context:o=null,depth:s=!0,stencil:c=!1,alpha:l=!1,antialias:u=!1,premultipliedAlpha:h=!0,preserveDrawingBuffer:v=!1,powerPreference:b=`default`,failIfMajorPerformanceCaveat:x=!1,reversedDepthBuffer:S=!1,outputBufferType:C=g}=n;this.isWebGLRenderer=!0;let w;if(o!==null){if(typeof WebGLRenderingContext<`u`&&o instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);w=o.getContextAttributes().alpha}else w=l;let T=C,E=new Set([r,He,ye]),D=new Set([g,a,ie,ne,ae,m]),O=new Uint32Array(4),ee=new Int32Array(4),te=new f,k=null,A=null,j=[],re=[],M=null;this.domElement=i,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let N=this,oe=!1,P=null,se=null,ce=null,le=null;this._outputColorSpace=Qe;let de=0,F=0,L=null,fe=-1,z=null,pe=new y,me=new y,he=null,B=new R(0),ge=0,_e=i.width,ve=i.height,V=1,be=null,xe=null,Se=new y(0,0,_e,ve),Ce=new y(0,0,_e,ve),we=!1,H=new p,U=!1,Ee=!1,De=new Le,Oe=new f,ke=new y,Ae={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},je=!1;function Me(){return L===null?V:1}let W=o;function Pe(e,t){return i.getContext(e,t)}let Fe,Ie,G,Re,K,q,Be,Ve,J,Ue,We,Ge,Ke,qe,Je,Ye,Xe,Ze,$e,et,X,Z,rt;try{let e={alpha:!0,depth:s,stencil:c,antialias:u,premultipliedAlpha:h,preserveDrawingBuffer:v,powerPreference:b,failIfMajorPerformanceCaveat:x};if(`setAttribute`in i&&i.setAttribute(`data-engine`,`three.js r186`),i.addEventListener(`webglcontextlost`,ot,!1),i.addEventListener(`webglcontextrestored`,ft,!1),i.addEventListener(`webglcontextcreationerror`,pt,!1),W===null){let t=`webgl2`;if(W=Pe(t,e),W===null)throw Pe(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}it()}catch(e){throw i.removeEventListener(`webglcontextlost`,ot,!1),i.removeEventListener(`webglcontextrestored`,ft,!1),i.removeEventListener(`webglcontextcreationerror`,pt,!1),t(`WebGLRenderer: `+e.message),e}function it(){Fe=new Ft(W),Fe.init(),X=new oi(W,Fe),Ie=new ut(W,Fe,n,X),G=new ii(W,Fe),Ie.reversedDepthBuffer&&S&&G.buffers.depth.setReversed(!0),se=W.createFramebuffer(),ce=W.createFramebuffer(),le=W.createFramebuffer(),Re=new Rt(W),K=new Rr,q=new ai(W,Fe,G,K,Ie,X,Re),Be=new Pt(N),Ve=new nt(W),Z=new ct(W,Ve),J=new It(W,Ve,Re,Z),Ue=new Bt(W,J,Ve,Z,Re),Ze=new zt(W,Ie,q),Je=new dt(K),We=new Lr(N,Be,Fe,Ie,Z,Je),Ge=new pi(N,K),Ke=new Hr,qe=new Yr(Fe),Xe=new st(N,Be,G,Ue,w,h),Ye=new ri(N,Ue,Ie),rt=new mi(W,Re,Ie,G),$e=new lt(W,Fe,Re),et=new Lt(W,Fe,Re),Re.programs=We.programs,N.capabilities=Ie,N.extensions=Fe,N.properties=K,N.renderLists=Ke,N.shadowMap=Ye,N.state=G,N.info=Re}T!==1009&&(M=new Ht(T,i.width,i.height,u,s,c));let at=new ui(N,W);this.xr=at,this.getContext=function(){return W},this.getContextAttributes=function(){return W.getContextAttributes()},this.forceContextLoss=function(){let e=Fe.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Fe.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return V},this.setPixelRatio=function(e){e!==void 0&&(V=e,this.setSize(_e,ve,!1))},this.getSize=function(e){return e.set(_e,ve)},this.setSize=function(e,t,n=!0){at.isPresenting?I(`WebGLRenderer: Can't change size while VR device is presenting.`):(_e=e,ve=t,i.width=Math.floor(e*V),i.height=Math.floor(t*V),n===!0&&(i.style.width=e+`px`,i.style.height=t+`px`),M!==null&&M.setSize(i.width,i.height),this.setViewport(0,0,e,t))},this.getDrawingBufferSize=function(e){return e.set(_e*V,ve*V).floor()},this.setDrawingBufferSize=function(e,t,n){_e=e,ve=t,V=n,i.width=Math.floor(e*n),i.height=Math.floor(t*n),this.setViewport(0,0,e,t)},this.setEffects=function(e){if(T===1009)t(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);else{if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){I(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}M.setEffects(e||[])}},this.getCurrentViewport=function(e){return e.copy(pe)},this.getViewport=function(e){return e.copy(Se)},this.setViewport=function(e,t,n,r){e.isVector4?Se.set(e.x,e.y,e.z,e.w):Se.set(e,t,n,r),G.viewport(pe.copy(Se).multiplyScalar(V).round())},this.getScissor=function(e){return e.copy(Ce)},this.setScissor=function(e,t,n,r){e.isVector4?Ce.set(e.x,e.y,e.z,e.w):Ce.set(e,t,n,r),G.scissor(me.copy(Ce).multiplyScalar(V).round())},this.getScissorTest=function(){return we},this.setScissorTest=function(e){G.setScissorTest(we=e)},this.setOpaqueSort=function(e){be=e},this.setTransparentSort=function(e){xe=e},this.getClearColor=function(e){return e.copy(Xe.getClearColor())},this.setClearColor=function(){Xe.setClearColor(...arguments)},this.getClearAlpha=function(){return Xe.getClearAlpha()},this.setClearAlpha=function(){Xe.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(L!==null){let t=L.texture.format;e=E.has(t)}if(e){let e=L.texture.type,t=D.has(e),n=Xe.getClearColor(),r=Xe.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(O[0]=i,O[1]=a,O[2]=o,O[3]=r,W.clearBufferuiv(W.COLOR,0,O)):(ee[0]=i,ee[1]=a,ee[2]=o,ee[3]=r,W.clearBufferiv(W.COLOR,0,ee))}else r|=W.COLOR_BUFFER_BIT}t&&(r|=W.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=W.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&W.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),P=e},this.dispose=function(){i.removeEventListener(`webglcontextlost`,ot,!1),i.removeEventListener(`webglcontextrestored`,ft,!1),i.removeEventListener(`webglcontextcreationerror`,pt,!1),Xe.dispose(),Ke.dispose(),qe.dispose(),K.dispose(),Be.dispose(),Ue.dispose(),Z.dispose(),rt.dispose(),We.dispose(),at.dispose(),at.removeEventListener(`sessionstart`,bt),at.removeEventListener(`sessionend`,xt),St.stop()};function ot(e){e.preventDefault(),Ne(`WebGLRenderer: Context Lost.`),oe=!0}function ft(){Ne(`WebGLRenderer: Context Restored.`),oe=!1;let e=Re.autoReset,t=Ye.enabled,n=Ye.autoUpdate,r=Ye.needsUpdate,i=Ye.type;it(),Re.autoReset=e,Ye.enabled=t,Ye.autoUpdate=n,Ye.needsUpdate=r,Ye.type=i}function pt(e){t(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function mt(e){let t=e.target;t.removeEventListener(`dispose`,mt),ht(t)}function ht(e){gt(e),K.remove(e)}function gt(e){let t=K.get(e).programs;t!==void 0&&(t.forEach(function(e){We.releaseProgram(e)}),e.isShaderMaterial&&We.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Ae);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=Mt(e,t,n,r,i);G.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=J.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;Z.setup(i,r,s,n,c);let h,g=$e;if(c!==null&&(h=Ve.get(c),g=et,g.setIndex(h)),i.isMesh)r.wireframe===!0?(G.setLineWidth(r.wireframeLinewidth*Me()),g.setMode(W.LINES)):g.setMode(W.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),G.setLineWidth(e*Me()),i.isLineSegments?g.setMode(W.LINES):i.isLineLoop?g.setMode(W.LINE_LOOP):g.setMode(W.LINE_STRIP)}else i.isPoints?g.setMode(W.POINTS):i.isSprite&&g.setMode(W.TRIANGLES);if(i.isBatchedMesh){if(Fe.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Ve.get(c).bytesPerElement:1,o=K.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(W,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function _t(e,t,n,r){P!==null&&e.isNodeMaterial&&P.setObject(r,e),U===!0&&Je.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,Ot(e,t,r),e.side=0,e.needsUpdate=!0,Ot(e,t,r),e.side=2):Ot(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),P!==null&&P.renderStart(e,t,n),A=qe.get(n),A.init(t),re.push(A),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(A.pushLight(e),e.castShadow&&A.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(A.pushLight(e),e.castShadow&&A.pushShadow(e))}),A.setupLights(),P!==null&&P.updateLights(A.state.lightsArray),Ee=this.localClippingEnabled,U=Je.init(this.clippingPlanes,Ee),U===!0&&Je.setGlobalState(this.clippingPlanes,t),P!==null&&Ye.render(A.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];_t(o,n,t,e),r.add(o)}else _t(i,n,t,e),r.add(i)}}),A=re.pop(),P!==null&&P.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){r.forEach(function(e){let t=K.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0?t(e):setTimeout(n,10)}Fe.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let vt=null;function yt(e){vt&&vt(e)}function bt(){St.stop()}function xt(){St.start()}let St=new tt;St.setAnimationLoop(yt),typeof self<`u`&&St.setContext(self),this.setAnimationLoop=function(e){vt=e,at.setAnimationLoop(e),e===null?St.stop():St.start()},at.addEventListener(`sessionstart`,bt),at.addEventListener(`sessionend`,xt),this.render=function(e,n){if(n!==void 0&&n.isCamera!==!0){t(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(oe===!0)return;P!==null&&P.renderStart(e,n);let r=at.enabled===!0&&at.isPresenting===!0,i=M!==null&&(L===null||r)&&M.begin(N,L);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),n.parent===null&&n.matrixWorldAutoUpdate===!0&&n.updateMatrixWorld(),at.enabled===!0&&at.isPresenting===!0&&(M===null||M.isCompositing()===!1)&&(at.cameraAutoUpdate===!0&&at.updateCamera(n),n=at.getCamera()),e.isScene===!0&&e.onBeforeRender(N,e,n,L),A=qe.get(e,re.length),A.init(n),A.state.textureUnits=q.getTextureUnits(),re.push(A),De.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),H.setFromProjectionMatrix(De,ze,n.reversedDepth),Ee=this.localClippingEnabled,U=Je.init(this.clippingPlanes,Ee),k=Ke.get(e,j.length),k.init(),j.push(k),at.enabled===!0&&at.isPresenting===!0){let e=N.xr.getDepthSensingMesh();e!==null&&Ct(e,n,-1/0,N.sortObjects)}Ct(e,n,0,N.sortObjects),k.finish(),P!==null&&P.updateLights(A.state.lightsArray),N.sortObjects===!0&&k.sort(be,xe),je=at.enabled===!1||at.isPresenting===!1||at.hasDepthSensing()===!1,je&&Xe.addToRenderList(k,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),U===!0&&Je.beginShadows();let a=A.state.shadowsArray;if(Ye.render(a,e,n),U===!0&&Je.endShadows(),(i&&M.hasRenderPass())===!1){let t=k.opaque,r=k.transmissive;if(A.setupLights(),n.isArrayCamera){let i=n.cameras;if(r.length>0)for(let n=0,a=i.length;n<a;n++){let a=i[n];Tt(t,r,e,a)}je&&Xe.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];wt(k,e,n,n.viewport)}}else r.length>0&&Tt(t,r,e,n),je&&Xe.render(e),wt(k,e,n)}L!==null&&F===0&&(q.updateMultisampleRenderTarget(L),q.updateRenderTargetMipmap(L)),i&&M.end(N),e.isScene===!0&&e.onAfterRender(N,e,n),Z.resetDefaultState(),fe=-1,z=null,re.pop(),re.length>0?(A=re[re.length-1],q.setTextureUnits(A.state.textureUnits),U===!0&&Je.setGlobalState(N.clippingPlanes,A.state.camera)):A=null,j.pop(),k=j.length>0?j[j.length-1]:null,P!==null&&P.renderEnd()};function Ct(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)A.pushLightProbeGrid(e);else if(e.isLight)A.pushLight(e),e.castShadow&&A.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||e.intersectsFrustum(H)){r&&ke.setFromMatrixPosition(e.matrixWorld).applyMatrix4(De);let i=Ue.update(e),a=e.material;a.visible&&k.push(e,i,a,n,ke.z,null,t)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||e.intersectsFrustum(H))){let i=Ue.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),ke.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),ke.copy(e.boundingSphere.center)),ke.applyMatrix4(e.matrixWorld).applyMatrix4(De)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&k.push(e,i,c,n,ke.z,s,t)}}else a.visible&&k.push(e,i,a,n,ke.z,null,t)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)Ct(i[e],t,n,r)}function wt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;A.setupLightsView(n),U===!0&&Je.setGlobalState(N.clippingPlanes,n),r&&G.viewport(pe.copy(r)),i.length>0&&Et(i,t,n),a.length>0&&Et(a,t,n),o.length>0&&Et(o,t,n),G.buffers.depth.setTest(!0),G.buffers.depth.setMask(!0),G.buffers.color.setMask(!0),G.setPolygonOffset(!1)}function Tt(t,n,r,i){if((r.isScene===!0?r.overrideMaterial:null)!==null)return;if(A.state.transmissionRenderTarget[i.id]===void 0){let t=Fe.has(`EXT_color_buffer_half_float`)||Fe.has(`EXT_color_buffer_float`);A.state.transmissionRenderTarget[i.id]=new _(1,1,{generateMipmaps:!0,type:t?d:g,minFilter:e,samples:Math.max(4,Ie.samples),stencilBuffer:c,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Y.workingColorSpace})}let a=A.state.transmissionRenderTarget[i.id],o=i.viewport||pe;a.setSize(o.z*N.transmissionResolutionScale,o.w*N.transmissionResolutionScale);let s=N.getRenderTarget(),l=N.getActiveCubeFace(),u=N.getActiveMipmapLevel();N.setRenderTarget(a),N.getClearColor(B),ge=N.getClearAlpha(),ge<1&&N.setClearColor(16777215,.5),N.clear(),je&&Xe.render(r);let f=N.toneMapping;N.toneMapping=0;let p=i.viewport;if(i.viewport!==void 0&&(i.viewport=void 0),A.setupLightsView(i),U===!0&&Je.setGlobalState(N.clippingPlanes,i),Et(t,r,i),q.updateMultisampleRenderTarget(a),q.updateRenderTargetMipmap(a),Fe.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let t=0,a=n.length;t<a;t++){let{object:a,geometry:o,material:s,group:c}=n[t];if(s.side===2&&a.layers.test(i.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,Dt(a,r,i,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(q.updateMultisampleRenderTarget(a),q.updateRenderTargetMipmap(a))}N.setRenderTarget(s,l,u),N.setClearColor(B,ge),p!==void 0&&(i.viewport=p),N.toneMapping=f}function Et(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&Dt(o,t,n,s,l,c)}}function Dt(e,t,n,r,i,a){P!==null&&i.isNodeMaterial&&P.setObject(e,i),e.onBeforeRender(N,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(N,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,N.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,N.renderBufferDirect(n,t,r,i,e,a),i.side=2):N.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(N,t,n,r,i,a)}function Ot(e,t,n){t.isScene!==!0&&(t=Ae);let r=K.get(e),i=A.state.lights,a=A.state.shadowsArray,o=i.state.version,s=We.getParameters(e,i.state,a,t,n,A.state.lightProbeGridArray),c=We.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Be.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,mt),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return At(e,s),d}else s.uniforms=We.getUniforms(e),P!==null&&e.isNodeMaterial&&P.build(e,n,s),e.onBeforeCompile(s,N),d=We.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Je.uniform),At(e,s),r.needsLights=Vt(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=A.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function kt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=Xn.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function At(e,t){let n=K.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function jt(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];te.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(te))return n}return null}function Mt(e,t,n,r,i){t.isScene!==!0&&(t=Ae),q.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=L===null?N.outputColorSpace:L.isXRRenderTarget===!0?L.texture.colorSpace:Y.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Be.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(L===null||L.isXRRenderTarget===!0)&&(h=N.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=K.get(r),y=A.state.lights;if(U===!0&&(Ee===!0||e!==z)){let t=e===z&&r.id===fe;Je.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Je.numPlanes||v.numIntersection!==Je.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=A.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let x=v.currentProgram;b===!0&&(x=Ot(r,t,i),P&&r.isNodeMaterial&&P.onUpdateProgram(r,x,v));let S=!1,C=!1,w=!1,T=x.getUniforms(),E=v.uniforms;if(G.useProgram(x.program)&&(S=!0,C=!0,w=!0),r.id!==fe&&(fe=r.id,C=!0),v.needsLights){let e=jt(A.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,C=!0)}if(S||z!==e){G.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),T.setValue(W,`projectionMatrix`,e.projectionMatrix),T.setValue(W,`viewMatrix`,e.matrixWorldInverse);let t=T.map.cameraPosition;t!==void 0&&t.setValue(W,Oe.setFromMatrixPosition(e.matrixWorld)),Ie.logarithmicDepthBuffer&&T.setValue(W,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&T.setValue(W,`isOrthographic`,e.isOrthographicCamera===!0),z!==e&&(z=e,C=!0,w=!0)}if(v.needsLights&&(y.state.sunShadowMap.length>0&&T.setValue(W,`sunShadowMap`,y.state.sunShadowMap,q),y.state.directionalShadowMap.length>0&&T.setValue(W,`directionalShadowMap`,y.state.directionalShadowMap,q),y.state.spotShadowMap.length>0&&T.setValue(W,`spotShadowMap`,y.state.spotShadowMap,q),y.state.pointShadowMap.length>0&&T.setValue(W,`pointShadowMap`,y.state.pointShadowMap,q)),i.isSkinnedMesh){T.setOptional(W,i,`bindMatrix`),T.setOptional(W,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),T.setValue(W,`boneTexture`,e.boneTexture,q))}i.isBatchedMesh&&(T.setOptional(W,i,`batchingTexture`),T.setValue(W,`batchingTexture`,i._matricesTexture,q),T.setOptional(W,i,`batchingIdTexture`),T.setValue(W,`batchingIdTexture`,i._indirectTexture,q),T.setOptional(W,i,`batchingColorTexture`),i._colorsTexture!==null&&T.setValue(W,`batchingColorTexture`,i._colorsTexture,q));let D=n.morphAttributes;if((D.position!==void 0||D.normal!==void 0||D.color!==void 0)&&Ze.update(i,n,x),(C||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,T.setValue(W,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(E.envMapIntensity.value=t.environmentIntensity),E.dfgLUT!==void 0&&(E.dfgLUT.value=_i()),C){if(T.setValue(W,`toneMappingExposure`,N.toneMappingExposure),v.needsLights&&Nt(E,w),a&&r.fog===!0&&Ge.refreshFogUniforms(E,a),Ge.refreshMaterialUniforms(E,r,V,ve,A.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;E.probesSH.value=e.texture,E.probesMin.value.copy(e.boundingBox.min),E.probesMax.value.copy(e.boundingBox.max),E.probesResolution.value.copy(e.resolution)}Xn.upload(W,kt(v),E,q)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(Xn.upload(W,kt(v),E,q),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&T.setValue(W,`center`,i.center),T.setValue(W,`modelViewMatrix`,i.modelViewMatrix),T.setValue(W,`normalMatrix`,i.normalMatrix),T.setValue(W,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];rt.update(n,x),rt.bind(n,x)}}return x}function Nt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Vt(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return de},this.getActiveMipmapLevel=function(){return F},this.getRenderTarget=function(){return L},this.setRenderTargetTextures=function(e,t,n){let r=K.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),K.get(e.texture).__webglTexture=t,K.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=K.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){L=e,de=t,F=n;let r=null,i=!1,a=!1;if(e){let o=K.get(e);if(o.__useDefaultFramebuffer!==void 0){G.bindFramebuffer(W.FRAMEBUFFER,o.__webglFramebuffer),pe.copy(e.viewport),me.copy(e.scissor),he=e.scissorTest,G.viewport(pe),G.scissor(me),G.setScissorTest(he),fe=-1;return}if(o.__webglFramebuffer===void 0)q.setupRenderTarget(e);else if(o.__hasExternalTextures)q.rebindTextures(e,K.get(e.texture).__webglTexture,K.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&K.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);q.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=K.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&q.useMultisampledRTT(e)===!1?K.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,pe.copy(e.viewport),me.copy(e.scissor),he=e.scissorTest}else pe.copy(Se).multiplyScalar(V).floor(),me.copy(Ce).multiplyScalar(V).floor(),he=we;if(n!==0&&(r=se),G.bindFramebuffer(W.FRAMEBUFFER,r)&&G.drawBuffers(e,r),G.viewport(pe),G.scissor(me),G.setScissorTest(he),i){let r=K.get(e.texture);W.framebufferTexture2D(W.FRAMEBUFFER,W.COLOR_ATTACHMENT0,W.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=K.get(e.textures[t]);W.framebufferTextureLayer(W.FRAMEBUFFER,W.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=K.get(e.texture);W.framebufferTexture2D(W.FRAMEBUFFER,W.COLOR_ATTACHMENT0,W.TEXTURE_2D,t.__webglTexture,n)}fe=-1};function Ut(e){let t=K.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=Ie.textureFormatReadable(e.format),t.__typeReadable=Ie.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,n,r,i,a,o,s,c=0){if(!(e&&e.isWebGLRenderTarget)){t(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let l=K.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&s!==void 0&&(l=l[s]),l){G.bindFramebuffer(W.FRAMEBUFFER,l);try{let s=e.textures[c],l=s.format,u=s.type;e.textures.length>1&&W.readBuffer(W.COLOR_ATTACHMENT0+c);let d=Ut(s);if(d.__formatReadable===!1){t(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(d.__typeReadable===!1){t(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}n>=0&&n<=e.width-i&&r>=0&&r<=e.height-a&&W.readPixels(n,r,i,a,X.convert(l),X.convert(u),o)}finally{let e=L===null?null:K.get(L).__webglFramebuffer;G.bindFramebuffer(W.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=K.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){G.bindFramebuffer(W.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&W.readBuffer(W.COLOR_ATTACHMENT0+s);let d=Ut(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=W.createBuffer();W.bindBuffer(W.PIXEL_PACK_BUFFER,f),W.bufferData(W.PIXEL_PACK_BUFFER,a.byteLength,W.STREAM_READ),W.readPixels(t,n,r,i,X.convert(l),X.convert(u),0),W.bindBuffer(W.PIXEL_PACK_BUFFER,null);let p=L===null?null:K.get(L).__webglFramebuffer;G.bindFramebuffer(W.FRAMEBUFFER,p);let m=W.fenceSync(W.SYNC_GPU_COMMANDS_COMPLETE,0);return W.flush(),await Te(W,m,4),W.bindBuffer(W.PIXEL_PACK_BUFFER,f),W.getBufferSubData(W.PIXEL_PACK_BUFFER,0,a),W.bindBuffer(W.PIXEL_PACK_BUFFER,null),W.deleteBuffer(f),W.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;q.setTexture2D(e,0),W.copyTexSubImage2D(W.TEXTURE_2D,n,0,0,o,s,i,a),G.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=X.convert(t.format),_=X.convert(t.type),v;t.isData3DTexture?(q.setTexture3D(t,0),v=W.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(q.setTexture2DArray(t,0),v=W.TEXTURE_2D_ARRAY):(q.setTexture2D(t,0),v=W.TEXTURE_2D),G.activeTexture(W.TEXTURE0),G.pixelStorei(W.UNPACK_FLIP_Y_WEBGL,t.flipY),G.pixelStorei(W.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),G.pixelStorei(W.UNPACK_ALIGNMENT,t.unpackAlignment);let y=G.getParameter(W.UNPACK_ROW_LENGTH),b=G.getParameter(W.UNPACK_IMAGE_HEIGHT),x=G.getParameter(W.UNPACK_SKIP_PIXELS),S=G.getParameter(W.UNPACK_SKIP_ROWS),C=G.getParameter(W.UNPACK_SKIP_IMAGES);G.pixelStorei(W.UNPACK_ROW_LENGTH,h.width),G.pixelStorei(W.UNPACK_IMAGE_HEIGHT,h.height),G.pixelStorei(W.UNPACK_SKIP_PIXELS,l),G.pixelStorei(W.UNPACK_SKIP_ROWS,u),G.pixelStorei(W.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=K.get(e),r=K.get(t),h=K.get(n.__renderTarget),g=K.get(r.__renderTarget);G.bindFramebuffer(W.READ_FRAMEBUFFER,h.__webglFramebuffer),G.bindFramebuffer(W.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(W.framebufferTextureLayer(W.READ_FRAMEBUFFER,W.COLOR_ATTACHMENT0,K.get(e).__webglTexture,i,d+n),W.framebufferTextureLayer(W.DRAW_FRAMEBUFFER,W.COLOR_ATTACHMENT0,K.get(t).__webglTexture,a,m+n)),W.blitFramebuffer(l,u,o,s,f,p,o,s,W.DEPTH_BUFFER_BIT,W.NEAREST);G.bindFramebuffer(W.READ_FRAMEBUFFER,null),G.bindFramebuffer(W.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||K.has(e)){let n=K.get(e),r=K.get(t);G.bindFramebuffer(W.READ_FRAMEBUFFER,ce),G.bindFramebuffer(W.DRAW_FRAMEBUFFER,le);for(let e=0;e<c;e++)w?W.framebufferTextureLayer(W.READ_FRAMEBUFFER,W.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):W.framebufferTexture2D(W.READ_FRAMEBUFFER,W.COLOR_ATTACHMENT0,W.TEXTURE_2D,n.__webglTexture,i),T?W.framebufferTextureLayer(W.DRAW_FRAMEBUFFER,W.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):W.framebufferTexture2D(W.DRAW_FRAMEBUFFER,W.COLOR_ATTACHMENT0,W.TEXTURE_2D,r.__webglTexture,a),i===0?T?W.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):W.copyTexSubImage2D(v,a,f,p,l,u,o,s):W.blitFramebuffer(l,u,o,s,f,p,o,s,W.COLOR_BUFFER_BIT,W.NEAREST);G.bindFramebuffer(W.READ_FRAMEBUFFER,null),G.bindFramebuffer(W.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?W.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?W.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):W.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?W.texSubImage2D(W.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?W.compressedTexSubImage2D(W.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):W.texSubImage2D(W.TEXTURE_2D,a,f,p,o,s,g,_,h);G.pixelStorei(W.UNPACK_ROW_LENGTH,y),G.pixelStorei(W.UNPACK_IMAGE_HEIGHT,b),G.pixelStorei(W.UNPACK_SKIP_PIXELS,x),G.pixelStorei(W.UNPACK_SKIP_ROWS,S),G.pixelStorei(W.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&W.generateMipmap(v),G.unbindTexture()},this.initRenderTarget=function(e){K.get(e).__webglFramebuffer===void 0&&q.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?q.setTextureCube(e,0):e.isData3DTexture?q.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?q.setTexture2DArray(e,0):q.setTexture2D(e,0),G.unbindTexture()},this.resetState=function(){de=0,F=0,L=null,G.reset(),Z.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return ze}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Y._getDrawingBufferColorSpace(e),t.unpackColorSpace=Y._getUnpackColorSpace()}},yi=`./data/`,GP=new URLSearchParams(location.search).get(`data`)||`https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/game_play/`;function bi(e,{min:t,max:n}){let r=new Uint16Array(e),i=new Float32Array(r.length),a=(n-t)/65535;for(let e=0;e<r.length;e++)i[e]=t+r[e]*a;return i}var xi=`edits/`;async function Si(e){try{let t=await fetch(e+`edits/edits.json`,{cache:`no-store`});return!t.ok||!t.headers.get(`content-type`)?.includes(`json`)?null:await t.json()}catch{return null}}async function Ci(e=``,{edits:t=!1}={}){let n=(e&&!e.startsWith(`diorama/`)?GP:yi)+e,r=await(await fetch(n+`world.json`)).json(),i=t?await Si(n):null,a=i?{...r.detail,...i.detail,file:xi+i.detail.file}:r.detail,[o,s]=await Promise.all([a,r.backdrop].map(e=>e&&fetch(n+e.file,{cache:i?`no-store`:`default`}).then(e=>e.arrayBuffer()))),c=new wi(a.size,a.cells,bi(o,a),a.center);return i&&(r.runs=i.runs,c.setHoles(i.tileCells,i.holes)),{meta:r,edits:i,detail:c,backdrop:s&&new wi(r.backdrop.size,r.backdrop.cells,bi(s,r.backdrop))}}var wi=class{constructor(e,t,n,r=[0,0]){this.size=e,this.cells=t,this.verts=t+1,this.step=e/t,this.half=e/2,this.center=r,this.x0=r[0]-this.half,this.z0=r[1]-this.half,this.h=n,this.setHoles(10,[])}setHoles(e,t){this.tileCells=e,this.tiles=Math.ceil(this.cells/e),this.tileSize=e*this.step,this.holes=new Uint8Array(this.tiles*this.tiles);for(let e of t)this.holes[e]=1;this.hasHoles=t.length>0}tileAt(e,t){let n=Math.floor((e-this.x0)/this.tileSize),r=Math.floor((t-this.z0)/this.tileSize);return n<0||r<0||n>=this.tiles||r>=this.tiles?-1:r*this.tiles+n}holeAt(e,t){if(!this.hasHoles)return!1;let n=this.tileAt(e,t);return n>=0&&this.holes[n]===1}cellIsHole(e,t){return this.hasHoles&&this.holes[Math.floor(t/this.tileCells)*this.tiles+Math.floor(e/this.tileCells)]===1}inside(e,t,n=0){return Math.abs(e-this.center[0])<this.half-n&&Math.abs(t-this.center[1])<this.half-n}heightAt(e,t){let n=this.verts,r=(e-this.x0)/this.step,i=(t-this.z0)/this.step;r=Math.min(Math.max(r,0),this.cells-1e-6),i=Math.min(Math.max(i,0),this.cells-1e-6);let a=Math.floor(r),o=Math.floor(i),s=r-a,c=i-o,l=o*n+a,u=this.h;return(u[l]*(1-s)+u[l+1]*s)*(1-c)+(u[l+n]*(1-s)+u[l+n+1]*s)*c}normalAt(e,t,n=new f){let r=this.heightAt(e-2,t),i=this.heightAt(e+2,t),a=this.heightAt(e,t-2),o=this.heightAt(e,t+2);return n.set(r-i,4,a-o).normalize()}},Ti=class{constructor(e,t,n=4,r=60,i=[0,0]){this.size=t,this.cell=n,this.half=t/2,this.x0=i[0]-this.half,this.z0=i[1]-this.half,this.n=Math.round(t/n)+1,this.maxDist=r,this.dist=new Float32Array(this.n*this.n).fill(r),this.run=new Int16Array(this.n*this.n).fill(-1),e.forEach((e,t)=>{let n=e.points;for(let e=0;e<n.length-1;e++)this.#e(n[e],n[e+1],t)})}#e(e,t,n){let{cell:r,n:i,maxDist:a}=this,o=Math.min(e[0],t[0])-a-this.x0,s=Math.max(e[0],t[0])+a-this.x0,c=Math.min(e[1],t[1])-a-this.z0,l=Math.max(e[1],t[1])+a-this.z0,u=Math.max(0,Math.floor(o/r)),d=Math.min(i-1,Math.ceil(s/r)),f=Math.max(0,Math.floor(c/r)),p=Math.min(i-1,Math.ceil(l/r)),m=t[0]-e[0],h=t[1]-e[1],g=m*m+h*h||1;for(let t=f;t<=p;t++){let a=t*r+this.z0;for(let o=u;o<=d;o++){let s=o*r+this.x0,c=((s-e[0])*m+(a-e[1])*h)/g;c=Math.max(0,Math.min(1,c));let l=e[0]+m*c-s,u=e[1]+h*c-a,d=Math.sqrt(l*l+u*u),f=t*i+o;d<this.dist[f]&&(this.dist[f]=d,this.run[f]=n)}}}distAt(e,t){let{cell:n,n:r}=this,i=(e-this.x0)/n,a=(t-this.z0)/n;i=Math.min(Math.max(i,0),r-1.0001),a=Math.min(Math.max(a,0),r-1.0001);let o=Math.floor(i),s=Math.floor(a),c=i-o,l=a-s,u=s*r+o,d=this.dist;return(d[u]*(1-c)+d[u+1]*c)*(1-l)+(d[u+r]*(1-c)+d[u+r+1]*c)*l}runAt(e,t){let{cell:n,n:r}=this,i=Math.round((e-this.x0)/n),a=Math.round((t-this.z0)/n);return i<0||a<0||i>=r||a>=r?-1:this.run[a*r+i]}},Ei=[{id:`east`,zh:`东区服务大厅`,en:`East Service Centre`,ele:1439,x:710,z:4410,faceTo:[610,4280],roof:`#5f8064`,lift:`1号索道`},{id:`west`,zh:`西区服务大厅`,en:`West Service Centre`,ele:1383,x:-1240,z:4640,faceTo:[-1183,4512],roof:`#4a5661`,lift:`3号索道`}],Di={snow:new R(`#fbfaf4`),snowShade:new R(`#eef1ec`),groomed:new R(`#e6eef0`),rock:new R(`#8f8c86`),rockDark:new R(`#6f7472`),forest:new R(`#4f6f5e`),forestDark:new R(`#3e5a4f`)};function Oi(e,t){let n=Math.sin(e*127.1+t*311.7)*43758.5453;return n-Math.floor(n)}function ki(e,t){let n=Math.floor(e),r=Math.floor(t),i=e-n,a=t-r,o=i*i*(3-2*i),s=a*a*(3-2*a),c=Oi(n,r),l=Oi(n+1,r),u=Oi(n,r+1),d=Oi(n+1,r+1);return(c*(1-o)+l*o)*(1-s)+(u*(1-o)+d*o)*s}function Ai(e,t){let{verts:n,size:r}=e,i=new Float32Array(n*n*3);for(let a=0;a<n;a++)for(let o=0;o<n;o++){let s=a*n+o,c=e.x0+o/e.cells*r,l=e.z0+a/e.cells*r;i[s*3]=c,i[s*3+1]=e.h[s]+(t?t(c,l):0),i[s*3+2]=l}let a=new Uint32Array(e.cells*e.cells*6),o=0;for(let t=0;t<e.cells;t++)for(let r=0;r<e.cells;r++){if(e.cellIsHole(r,t))continue;let i=t*n+r,s=i+1,c=i+n,l=c+1;a[o++]=i,a[o++]=c,a[o++]=s,a[o++]=s,a[o++]=c,a[o++]=l}let s=new G;return s.setAttribute(`position`,new V(i,3)),s.setIndex(new V(a.subarray(0,o),1)),s.computeVertexNormals(),s}function ji(e,t,n,{skirt:r=!0,tiles:i=1,lodDistance:a=0}={}){let o=Ai(e),s=o.attributes.position,c=o.attributes.normal,l=new Float32Array(s.count*3),u=new R;for(let e=0;e<s.count;e++){let r=s.getX(e),i=s.getY(e),a=s.getZ(e),o=c.getY(e),d=Math.acos(Math.min(1,o))*180/Math.PI,f=ki(r*.02,a*.02);u.copy(Di.snow).lerp(Di.snowShade,f*.6);let p=t.distAt(r,a),m=1-U.smoothstep(p,14,18);u.lerp(Di.groomed,m*.9);let h=U.smoothstep(d+(f-.5)*12,34,40)*(1-m);h>0&&u.lerp(ki(r*.08,a*.08)>.5?Di.rock:Di.rockDark,h),i<n&&p>21&&u.lerp(Di.snowShade,.5),l[e*3]=u.r,l[e*3+1]=u.g,l[e*3+2]=u.b}o.setAttribute(`color`,new V(l,3));let d=H({vertexColors:!0},{hatch:1,snow:1}),p=new M,m=e=>{let t=new J(e,d);return t.receiveShadow=!0,p.add(t),t},h=(i>1?Mi(o,e,i):[o]).map(m),g=a?Mi(o,e,i,2).map(m):[];return r&&p.add(new J(Ni(o,e),d)),p.update=e=>{h.forEach((t,n)=>{let r=t.geometry.boundingSphere,i=r.center.distanceTo(e)-r.radius>a;t.visible=!i,g[n].visible=i})},a&&p.update(new f(1/0,0,0)),p}function Mi(e,t,n,r=1){let i=t.verts,a=Math.ceil(t.cells/n),o=[];for(let s=0;s<n;s++)for(let c=0;c<n;c++){let n=c*a,l=Math.min(t.cells,n+a),u=s*a,d=Math.min(t.cells,u+a);if(n>=l||u>=d)continue;let f=Math.floor((l-n)/r)+1,p=Math.floor((d-u)/r)+1,m=[];if(r>1){for(let e=0;e<f-1;e++)m.push(e);for(let e=0;e<p-1;e++)m.push(e*f+f-1);for(let e=f-1;e>0;e--)m.push((p-1)*f+e);for(let e=p-1;e>0;e--)m.push(e*f)}let h=f*p+m.length,g=new G;for(let t of[`position`,`normal`,`color`]){let a=e.attributes[t].array,o=new Float32Array(h*3);for(let e=0;e<p;e++)for(let t=0;t<f;t++){let s=(u+e*r)*i+n+t*r;o.set(a.subarray(s*3,s*3+3),(e*f+t)*3)}m.forEach((e,t)=>o.set(o.subarray(e*3,e*3+3),(f*p+t)*3)),t===`position`&&m.forEach((e,t)=>o[(f*p+t)*3+1]-=6),g.setAttribute(t,new V(o,3))}let _=[];for(let e=0;e<p-1;e++)for(let i=0;i<f-1;i++){if(t.cellIsHole(n+i*r,u+e*r))continue;let a=e*f+i,o=a+1,s=a+f,c=s+1;_.push(a,s,o,o,s,c)}m.forEach((e,t)=>{let n=(t+1)%m.length;_.push(e,m[n],f*p+t,m[n],f*p+n,f*p+t)}),g.setIndex(_),g.computeBoundingSphere(),o.push(g)}return o}function Ni(e,t){let n=e.attributes.position.array,r=e.attributes.color.array,i=e.attributes.normal.array,a=t.verts,o=[];for(let e=0;e<a;e++)o.push(e);for(let e=1;e<a;e++)o.push(e*a+a-1);for(let e=a-2;e>=0;e--)o.push((a-1)*a+e);for(let e=a-2;e>=0;e--)o.push(e*a);let s=[],c=[],l=[],u=[];o.forEach((e,t)=>{s.push(n[e*3],n[e*3+1],n[e*3+2],n[e*3],n[e*3+1]-120,n[e*3+2]),c.push(r[e*3],r[e*3+1],r[e*3+2],r[e*3]*.9,r[e*3+1]*.9,r[e*3+2]*.9),l.push(i[e*3],i[e*3+1],i[e*3+2],i[e*3],i[e*3+1],i[e*3+2]),t&&u.push(2*t-2,2*t,2*t-1,2*t,2*t+1,2*t-1)});let d=new G;return d.setAttribute(`position`,new et(s,3)),d.setAttribute(`color`,new et(c,3)),d.setAttribute(`normal`,new et(l,3)),d.setIndex(u),d}function Pi(e,t,n,r=[]){let i=Ai(e,(e,n)=>t.inside(e,n,20)?-80:0),a=i.attributes.position,o=i.attributes.normal,s=new Float32Array(a.count*3),c=new R;for(let e=0;e<a.count;e++){let t=a.getX(e),i=a.getY(e),l=a.getZ(e),u=Math.acos(Math.min(1,o.getY(e)))*180/Math.PI,d=ki(t*.0015,l*.0015);c.copy(Di.snow).lerp(Di.snowShade,d);let f=U.smoothstep(n+120-i+(d-.5)*250,0,150)*(1-U.smoothstep(u,30,40));f*=.3+.7*U.smoothstep(ki(t*.0011+7,l*.0011),.38,.62);for(let e of r)f*=.3+.7*U.smoothstep(Math.hypot(t-e.x,l-e.z),e.r,e.r*3);c.lerp(d>.5?Di.forest:Di.forestDark,f*.85);let p=U.smoothstep(u,33,42);c.lerp(Di.rockDark,p*.8),s[e*3]=c.r,s[e*3+1]=c.g,s[e*3+2]=c.b}return i.setAttribute(`color`,new V(s,3)),new J(i,H({vertexColors:!0},{hatch:0}))}var Fi=new R(`#4d7560`),Ii=new R(`#3d6352`),Li=new R(`#f6f7f2`),Ri=new R(`#6b5248`);function zi(e,t){let n=e.index?e.toNonIndexed():e,r=n.attributes.position,i=new Float32Array(r.count*3),a=new R;for(let e=0;e<r.count/3;e++){t(a,(r.getY(e*3)+r.getY(e*3+1)+r.getY(e*3+2))/3,e);for(let t=0;t<3;t++)a.toArray(i,(e*3+t)*3)}return n.setAttribute(`color`,new V(i,3)),n.computeVertexNormals(),n}function Bi(e,t,n,r,i,a){let o=new k(e,t,r,a,!0),s=o.attributes.position;for(let e=0;e<s.count;e++)if(s.getY(e)<-t/2+.01){let t=Math.atan2(s.getZ(e),s.getX(e)),n=1+.12*Math.sin(t*5+i*3);s.setX(e,s.getX(e)*n),s.setZ(e,s.getZ(e)*n),s.setY(e,s.getY(e)-.25*Math.abs(Math.sin(t*2.5+i)))}return o.rotateY(i),o.translate(0,n,0),zi(o,(e,r,i)=>{let a=(r-(n-t/2))/t,o=a>.6||a>.3&&i%3==0;e.copy(o?Li:i%2?Fi:Ii)})}function Vi(e){let t=[];if(!e){let e=new s(.22,.32,3,5,1,!0).translate(0,1.5,0);t.push(zi(e,e=>e.copy(Ri)))}(e?[[2.7,7,4.6],[1.7,5.8,8.8]]:[[2.8,4.6,3.8],[2.1,4.4,7],[1.3,3.8,9.9]]).forEach(([n,r,i],a)=>t.push(Bi(n,r,i,e?6:7,a*1.3,e?1:2)));let n=Be(t.map(e=>(e.deleteAttribute(`uv`),e)));return n.computeBoundingSphere(),n}var Hi={treeline:2350,spacing:10,density:.5,clearings:Ei.map(e=>({x:e.x,z:e.z,r:110}))};function Ui(e,t,n,{treeline:r,spacing:i=10,scale:a=1,density:o=.5,clearings:s=[],area:c=null}){let l=n.map(e=>[e.points[0],e.points[e.points.length-1]]),u=(e,t)=>{let n=1/0;for(let[r,i]of l){let a=i[0]-r[0],o=i[1]-r[1],s=((e-r[0])*a+(t-r[1])*o)/(a*a+o*o);s=Math.max(0,Math.min(1,s)),n=Math.min(n,Math.hypot(r[0]+a*s-e,r[1]+o*s-t))}return n},d=2.8*(a-1),p=new f,m=Math.ceil(e.size/i),h=(e,t)=>Math.max(0,Math.ceil((e-t)/i)),g=(e,t)=>Math.min(m-1,Math.floor((e-t)/i)),[_,v,y,b]=c?[h(c[0],e.x0),h(c[1],e.z0),g(c[2],e.x0),g(c[3],e.z0)]:[0,0,m-1,m-1],x=[];for(let n=v;n<=b;n++){let c=e.z0+n*i;for(let l=_;l<=y;l++){let f=e.x0+l*i,h=f+(qi(f,c)-.5)*i*.9,g=c+(qi(c+3.3,f)-.5)*i*.9;if(!e.inside(h,g,30)||e.holeAt(h,g))continue;let _=e.heightAt(h,g),v=r+(ki(h*.006,g*.006)-.5)*160;if(_>v)continue;let y=U.smoothstep(_,v-120,v);qi(h*1.7,g)<y*.85||t.distAt(h,g)<19+d+qi(h,g*1.3)*6||u(h,g)<9+d||(e.normalAt(h,g,p),!(p.y<.78)&&(ki(h*.012+40,g*.012)<.42||qi(h+5.1,g*.7)>o||s.some(e=>Math.hypot(h-e.x,g-e.z)<e.r+d)||x.push(Gi(n*m+l,h,g,(.75+qi(g,h*2.1)*.55)*(1-y*.4)*a))))}}return x}function Wi(e,t,n,r=1){if(!n)return{trees:e,removed:[]};let i=n.removed instanceof Set?n.removed:new Set(n.removed||[]),a=[],o=[];for(let t of e)(i.has(t.id)?o:a).push(t);return(n.added||[]).forEach(([e,n,i],o)=>{t.inside(e,n)&&!t.holeAt(e,n)&&a.push(Gi(-1-o,e,n,i*r))}),{trees:a,removed:o}}function Gi(e,t,n,r){return{id:e,x:t,z:n,s:r,sy:r*(.9+qi(t+2,n)*.3),rot:qi(t,n+9)*Math.PI*2}}function Ki(e,t,n,{chunk:r=250,lodDistance:i=450,edits:a=null,...s}){let c=Vi(0),l=Vi(1),u=H({vertexColors:!0},{hatch:1}),d=a?.density??s.density,{trees:p}=Wi(Ui(e,t,n,{...s,...d!==void 0&&{density:d}}),e,a,s.scale),m=r,h=new Map,g=new Map,_=new f(0,1,0),v=new Le,y=new o,b=new f,x=new f;for(let t of p){y.setFromAxisAngle(_,t.rot),b.set(t.s,t.sy,t.s),x.set(t.x,e.heightAt(t.x,t.z)-.3,t.z),v.compose(x,y,b);let n=`${Math.floor(t.x/m)},${Math.floor(t.z/m)}`,r=h.get(n);r||h.set(n,r=[]),r.push(v.clone());let i=`${Math.floor(t.x/10)},${Math.floor(t.z/10)}`,a=g.get(i);a||g.set(i,a=[]),a.push({x:t.x,z:t.z,r:.45*t.s+.15})}let S=p.length,C=new M,w=(e,t,n)=>{let r=new q(e,u,t.length);return t.forEach((e,t)=>r.setMatrixAt(t,e)),r.castShadow=n,r.receiveShadow=!1,r.computeBoundingSphere(),C.add(r),r},T=new Map;for(let[t,n]of h){let[r,i]=t.split(`,`).map(Number),a=new f((r+.5)*m,0,(i+.5)*m);a.y=e.heightAt(a.x,a.z);let o=`${Math.floor(r/4)},${Math.floor(i/4)}`,s=T.get(o);s||T.set(o,s={chunks:[],mats:[]}),s.chunks.push({center:a,hi:w(c,n,!0),lo:w(l,n,!1)}),s.mats.push(...n)}for(let[t,n]of T){let[r,i]=t.split(`,`).map(Number);n.center=new f((r+.5)*m*4,0,(i+.5)*m*4),n.center.y=e.heightAt(n.center.x,n.center.z),n.lo=w(l,n.mats,!1)}let E=i+m*4*.75;return console.log(`forest: ${S} trees in ${h.size} chunks, ${T.size} far batches`),{group:C,count:S,farMeshes:[...T.values()].flatMap(e=>[e.lo,...e.chunks.map(e=>e.lo)]),update(e){for(let t of T.values()){let n=t.center.distanceTo(e)>E;t.lo.visible=n;for(let r of t.chunks)r.hi.visible=!n&&r.center.distanceTo(e)<i,r.lo.visible=!n&&!r.hi.visible}},hit(e,t,n){let r=Math.floor(e/10),i=Math.floor(t/10);for(let a=i-1;a<=i+1;a++)for(let i=r-1;i<=r+1;i++){let r=g.get(`${i},${a}`);if(r)for(let i of r){let r=e-i.x,a=t-i.z,o=n+i.r;if(r*r+a*a<o*o)return i}}return null}}}function qi(e,t){let n=Math.sin(e*12.9898+t*78.233)*43758.5453;return n-Math.floor(n)}var Ji={steel:H({color:`#9aa3a6`}),dark:H({color:`#3a4249`}),cabin:H({color:`#f0c24a`},{rim:1}),cabinRed:H({color:`#d9604c`},{rim:1}),cabinGray:H({color:`#aeb5b8`},{rim:1}),glass:H({color:`#2f4752`}),wall:H({color:`#d8cfc0`}),roof:H({color:`#4f6f7a`}),wood:H({color:`#9b7458`}),cable:new le({color:`#2a3138`})},Yi={easy:`#4f8fd6`,novice:`#4f8fd6`,intermediate:`#d9534a`,advanced:`#23303a`,expert:`#23303a`,freeride:`#f08a24`};function Xi(e,t,n){let r=new M,i=new J(new B(e,n,t),Ji.wall);i.position.y=n/2;let a=new J(new s(.01,e*.75,2.6,4,1),Ji.roof);a.rotation.y=Math.PI/4,a.scale.set(1,1,t/e),a.position.y=n+1.3;let o=new J(new B(e*.5,n*.55,.3),Ji.glass);o.position.set(0,n*.28,t/2);for(let e of[i,a,o])e.castShadow=!0,e.receiveShadow=!0,r.add(e);return r}var Zi={"6号索道":`gray`,"2号索道":`yellow`},Qi={red:null,yellow:`#f0c24a`,gray:`#aeb5b8`},$i=e=>Zi[e]||`red`,ea=4.2,ta=3,na=18,ra=`./models/lifts/`,ia=null;function aa(){return ia||=(async()=>{let e=new Ue,[t,n,r]=await Promise.all([`cabin`,`chair`,`station`].map(t=>e.loadAsync(`${ra}${t}.glb`).then(oa))),i=sa(t.geometry,ea),a=r.geometry;a.computeBoundingBox();let o=a.boundingBox,s=na/(o.max.z-o.min.z);a.translate(-(o.min.x+o.max.x)/2,-o.min.y,-(o.min.z+o.max.z)/2).scale(s,s,s),a.computeBoundingBox();let c=(e,t)=>H({map:t,side:e.side},{rim:1});return{cabin:i,cabinMats:Object.fromEntries(Object.entries(Qi).map(([e,n])=>[e,c(t.material,n?ca(t.material.map,n):t.material.map)])),chair:sa(n.geometry,ta),chairMat:c(n.material,n.material.map),station:a,stationMat:H({map:r.material.map}),stationHalfWidth:a.boundingBox.max.x,stationHeight:a.boundingBox.max.y}})()}function oa(e){let t=null;return e.scene.updateMatrixWorld(!0),e.scene.traverse(e=>{e.isMesh&&!t&&(t=e)}),{geometry:t.geometry.clone().applyMatrix4(t.matrixWorld),material:t.material}}function sa(e,t){e.computeBoundingBox();let{min:n,max:r}=e.boundingBox,i=t/(r.y-n.y),a=(r.y-(r.y-n.y)*.05)*i;e.scale(i,i,i);let o=new f(1/0,1/0,1/0),s=o.clone().negate(),c=new f,l=e.attributes.position;for(let e=0;e<l.count;e++)c.fromBufferAttribute(l,e),!(c.y<a)&&(o.min(c),s.max(c));return e.translate(-(o.x+s.x)/2,-(o.y+s.y)/2,-(o.z+s.z)/2)}function ca(e,t){let n=e.image,r=document.createElement(`canvas`);r.width=n.width,r.height=n.height;let i=r.getContext(`2d`);i.drawImage(n,0,0);let a=i.getImageData(0,0,r.width,r.height),o=a.data,s={};new R(t).getRGB(s,Qe);for(let e=0;e<o.length;e+=4){let t=o[e],n=Math.max(o[e+1],o[e+2]),r=U.smoothstep(t?(t-n)/t:0,.3,.6);if(!r)continue;let i=Math.min(t/225,1.1);o[e]+=(s.r*255*i-t)*r,o[e+1]+=(s.g*255*i-o[e+1])*r,o[e+2]+=(s.b*255*i-o[e+2])*r}i.putImageData(a,0,0);let c=new Ce(r);for(let t of[`flipY`,`colorSpace`,`wrapS`,`wrapT`,`magFilter`,`minFilter`,`anisotropy`])c[t]=e[t];return c}function la(e,t){let n=e.match(/(\d+)号/)?.[1];if(!n)return null;let r={red:`#d9604c`,yellow:`#f0c24a`,gray:`#aeb5b8`,chair:`#4f6f7a`}[t],i=t===`red`||t===`chair`?`#fbfaf5`:`#23303a`,a=document.createElement(`canvas`);a.width=a.height=256;let o=a.getContext(`2d`);o.beginPath(),o.arc(128,128,116,0,Math.PI*2),o.fillStyle=r,o.fill(),o.lineWidth=14,o.strokeStyle=`#23303a`,o.stroke(),o.fillStyle=i,o.textAlign=`center`,o.textBaseline=`middle`,o.font=`700 168px "Patrick Hand SC", sans-serif`,o.fillText(n,128,140);let s=new Ce(a);return s.colorSpace=Qe,s.anisotropy=4,new ke({map:s,alphaTest:.5})}var ua=6,da=14,fa=5,pa=20;function ma(e,t,{scale:n=1,stationScale:r=n,spacing:i=1,speed:a=5}={}){let o=new M,c=[],l=[],u=[],d=[],p=[],m=[],h=Be([new s(.35,.5,1,6).translate(0,.5,0)]),g=new B(7.5,.4,.5),_=[],v=[],y=new Se,b=e=>`${e[0]},${e[1]}`,x=new Map;for(let e of t)if(e.type!==`magic_carpet`)for(let t of[e.points[0],e.points[e.points.length-1]])x.set(b(t),(x.get(b(t))||0)+1);let S=(e,t)=>{if(x.get(b(e))<2)return e;let n=t[0]-e[0],i=t[1]-e[1],a=Math.hypot(n,i),o=pa*r;return[e[0]+n/a*o,e[1]+i/a*o]},C=(e,t,n,r,i,a,o=a)=>{y.position.set(t,n,r),y.rotation.set(0,i,0),y.scale.set(a,o,a),y.updateMatrix(),e.push(y.matrix.clone())};for(let a of t){if(a.type===`magic_carpet`){let t=ha(e,a,r);o.add(t.mesh),l.push(t);continue}let t=a.points,s=t.length-1,h=S(t[0],t[1]),g=S(t[s],t[s-1]),y=new f(h[0],e.heightAt(h[0],h[1]),h[1]),b=new f(g[0],e.heightAt(g[0],g[1]),g[1]),x=new f(b.x-y.x,0,b.z-y.z),w=x.length();x.normalize();let T=new f(-x.z,0,x.x),D=Math.atan2(x.x,x.z),O=a.type===`gondola`,ee=(O?13:9)*n,te=O?$i(a.name):`chair`,ne=a.name&&la(a.name,te);for(let[e,t]of[[y,0],[b,Math.PI]]){let n=new M;if(n.add(Xi(14,18,7)),n.scale.setScalar(r),n.position.copy(e),n.rotation.y=D+t,o.add(n),p.push(n),ne){let e=new E(ne);e.scale.setScalar(ua),e.position.set(0,da,fa),n.add(e),m.push(e)}d.push({x:e.x,z:e.z,yaw:D,hw:7*r,hd:9*r})}let k=Math.max(2,Math.round(w/140)),A=[];for(let t=0;t<=k;t++){let r=t/k,i=y.x+(b.x-y.x)*r,a=y.z+(b.z-y.z)*r,o=e.heightAt(i,a);A.push(new f(i,o+ee,a)),t!==0&&t!==k&&(C(_,i,o-.5,a,0,n,ee+1),C(v,i,o+ee+.3,a,D+Math.PI/2,n))}A[0].y=y.y+6*n,A[k].y=b.y+6*n;let j=[-3*n,3*n].map(e=>A.map(t=>t.clone().addScaledVector(T,e)));for(let e of j)o.add(new oe(new G().setFromPoints(e),Ji.cable));let re=j.map(e=>{let t=[0];for(let n=1;n<e.length;n++)t.push(t[n-1]+e[n].distanceTo(e[n-1]));return t});u.push({id:a.id,name:a.name,type:a.type,a:y,b,cable:j[0],acc:re[0]});let ie=(O?55:25)*i,ae=Math.floor(re[0][re[0].length-1]/ie);for(let e=0;e<2;e++)for(let t=0;t<ae;t++){let n=te;c.push({kind:n,lane:j[e],acc:re[e],s:t*ie,up:e===0,yaw:D})}}let w=(e,t,n)=>{let r=new q(e,t,n);return r.castShadow=!0,r.frustumCulled=!1,o.add(r),r};for(let[e,t,n]of[[h,Ji.steel,_],[g,Ji.dark,v]]){if(!n.length)continue;let r=w(e,t,n.length);n.forEach((e,t)=>r.setMatrixAt(t,e))}let T={};for(let e of[`red`,`yellow`,`gray`,`chair`]){let t=c.filter(t=>t.kind===e);if(!t.length)continue;let n=w(ya(e),ga,t.length);t.forEach((e,t)=>{e.mesh=n,e.index=t}),T[e]=n}aa().then(e=>{for(let[t,n]of Object.entries(T))n.geometry=t===`chair`?e.chair:e.cabin,n.material=t===`chair`?e.chairMat:e.cabinMats[t];for(let t of p){let n=new J(e.station,e.stationMat);n.castShadow=n.receiveShadow=!0,t.children[0].removeFromParent(),t.add(n)}for(let t of m)t.position.y=e.stationHeight+ua*.75;for(let t of d)t.hw=e.stationHalfWidth*r}).catch(e=>console.warn(`Lift models failed to load; keeping the box stand-ins.`,e));let D=new f;return{group:o,lines:u,footprints:d,update(e){for(let t of l)t.tex.offset.y=(t.tex.offset.y-e*t.rate)%1;for(let t of c){let r=t.acc[t.acc.length-1];t.s=(t.s+e*a)%r;let i=t.up?t.s:r-t.s,o=1;for(;o<t.acc.length-1&&t.acc[o]<i;)o++;let s=(i-t.acc[o-1])/(t.acc[o]-t.acc[o-1]);D.lerpVectors(t.lane[o-1],t.lane[o],s),y.position.copy(D),y.rotation.set(0,t.yaw+(t.up?0:Math.PI),Math.sin(t.s*.3)*.03),y.scale.setScalar(n),y.updateMatrix(),t.mesh.setMatrixAt(t.index,y.matrix)}for(let e of Object.values(T))e.instanceMatrix.needsUpdate=!0}}}function ha(e,t,n){let r=document.createElement(`canvas`);r.width=16,r.height=64;let i=r.getContext(`2d`);i.fillStyle=`#3a4249`,i.fillRect(0,0,16,64),i.fillStyle=`#9aa3a6`,i.fillRect(0,0,16,10);let a=new Ce(r);a.wrapT=Re,a.colorSpace=Qe;let o=.6*n,s=.3*n,c=[],l=t.points;for(let e=0;e<l.length-1;e++){let t=Math.hypot(l[e+1][0]-l[e][0],l[e+1][1]-l[e][1]);for(let n=0;n<t;n+=4)c.push([l[e][0]+(l[e+1][0]-l[e][0])*n/t,l[e][1]+(l[e+1][1]-l[e][1])*n/t])}c.push(l[l.length-1]);let u=[],d=[],f=[],p=0;c.forEach(([t,n],r)=>{let i=c[Math.max(0,r-1)],a=c[Math.min(c.length-1,r+1)],l=Math.hypot(a[0]-i[0],a[1]-i[1])||1,m=-(a[1]-i[1])/l,h=(a[0]-i[0])/l;r&&(p+=Math.hypot(t-c[r-1][0],n-c[r-1][1])/(o*3));for(let r of[-1,1]){let i=t+m*o*r,a=n+h*o*r;u.push(i,e.heightAt(i,a)+s,a),d.push((r+1)/2,p)}if(r){let e=r*2;f.push(e-2,e,e-1,e-1,e,e+1)}});let m=new G;m.setAttribute(`position`,new et(u,3)),m.setAttribute(`uv`,new et(d,2)),m.setIndex(f),m.computeVertexNormals();let h=new J(m,H({map:a,side:2},{hatch:0}));return h.receiveShadow=!0,{mesh:h,tex:a,rate:1/(o*3)}}var ga=H({vertexColors:!0},{rim:1}),_a=new Map;function va(e,t,n,r,i){e.translate(n,r,i);let a=new R(t),o=e.attributes.position.count;return e.setAttribute(`color`,new et(Array.from({length:o*3},(e,t)=>a.toArray()[t%3]),3)),e}function ya(e){if(_a.has(e))return _a.get(e);let t=e===`chair`?[va(new B(.1,2,.1),Ji.dark.color,0,-1,0),va(new B(2.4,.15,.7),Ji.steel.color,0,-2,0),va(new B(2.4,.7,.1),Ji.steel.color,0,-1.65,-.35)]:[va(new B(.12,2.2,.12),Ji.dark.color,0,-1.1,0),va(new B(1.9,2,2.2),{red:Ji.cabinRed,yellow:Ji.cabin,gray:Ji.cabinGray}[e].color,0,-3.1,0),va(new B(1.95,.8,1.7),Ji.glass.color,0,-2.7,0),va(new B(1.7,.25,2),Ji.dark.color,0,-2,0)],n=Be(t);return _a.set(e,n),n}function ba(){let e=new M,t=new J(ya(`red`),ga);t.castShadow=!0,e.add(t);let n=`red`,r=null,i=()=>{r?(t.geometry=r.cabin,t.material=r.cabinMats[n]):t.geometry=ya(n)};return aa().then(e=>{r=e,i()}).catch(()=>{}),e.setLine=e=>{n=$i(e),i()},e}function xa(e,t){let n=new s(.05,.05,1.8,5).translate(0,.9,0),r=new s(.07,.07,.45,5).translate(0,1.6,0),i=new Map;for(let n of t){let t=n.points,r=0;for(let a=0;a<t.length-1;a++){let o=t[a][0],s=t[a][1],c=t[a+1][0],l=t[a+1][1],u=Math.hypot(c-o,l-s),d=-(l-s)/u,f=(c-o)/u;for(let t=r;t<u;t+=35){let a=t/u,p=o+(c-o)*a,m=s+(l-s)*a;for(let t of[-1,1]){let r=p+d*t*18,a=m+f*t*18,o=Yi[n.difficulty]||Yi.intermediate;i.has(o)||i.set(o,[]),i.get(o).push([r,e.heightAt(r,a),a])}r=t+35-u}r<0&&(r=0)}}let a=new M,o=H({color:`#e9a23b`}),c=new Le;for(let[e,t]of i){let i=H({color:e}),s=new q(n,o,t.length),l=new q(r,i,t.length);t.forEach(([e,t,n],r)=>{c.makeTranslation(e,t-.1,n),s.setMatrixAt(r,c),l.setMatrixAt(r,c)}),s.computeBoundingSphere(),l.computeBoundingSphere(),a.add(s,l)}return a}function Sa(e,t,n){let r=document.createElement(`canvas`);r.width=1024,r.height=256;let i=r.getContext(`2d`);i.fillStyle=t,i.fillRect(0,0,r.width,r.height),i.strokeStyle=`#23303a`,i.lineWidth=14,i.strokeRect(7,7,r.width-14,r.height-14),i.fillStyle=n,i.textAlign=`center`,i.textBaseline=`middle`,i.font=`700 104px "Patrick Hand SC", "PingFang SC", sans-serif`,i.font=`700 ${Math.min(104,900*104/i.measureText(e[0]).width)}px "Patrick Hand SC", "PingFang SC", sans-serif`,i.fillText(e[0],r.width/2,e[1]?100:128),e[1]&&(i.font=`56px "Patrick Hand SC", sans-serif`,i.font=`${Math.min(56,900*56/i.measureText(e[1]).width)}px "Patrick Hand SC", sans-serif`,i.fillText(e[1],r.width/2,196));let a=new Ce(r);return a.colorSpace=Qe,a.anisotropy=4,a}function Ca(e,{x:t,z:n,faceTo:r,roof:i,zh:a,en:o,ele:c},{scale:l=1}={}){let u=new M,d=Math.atan2(r[0]-t,r[1]-n),f=1/0,p=-1/0,m=Math.cos(d),h=Math.sin(d);for(let r=-.5;r<=.5;r+=.125)for(let i=-.5;i<=.5;i+=.25){let a=r*96*1.3*l,o=i*34*1.6*l,s=e.heightAt(t+a*m+o*h,n-a*h+o*m);f=Math.min(f,s),p=Math.max(p,s)}u.position.set(t,p,n),u.rotation.y=d,u.scale.setScalar(l);let g=(p-f)/l+2,_=H({color:i},{rim:1}),v=(e,t,n,r,i)=>{let a=new J(e,t);return a.position.set(n,r,i),a.castShadow=!0,a.receiveShadow=!0,u.add(a),a};v(new B(120,g,51),Ji.wall,0,-g/2+.4,0),v(new B(96,10,34),Ji.wall,0,5,0),v(new B(82.56,6,.6),Ji.glass,0,4.2,17),v(new B(90.24,7,24.48),Ji.wood,0,13.5,-2.04);let y=(e,t,n)=>{let r=v(new B(e,1.2,32.3),_,t,17.3+Math.tan(Math.abs(n))*e*.5,-1.36);r.rotation.z=n};y(51.84,-23.04,-.16),y(48,24,.11),v(new B(22,1,9),_,11.52,6.2,21.2);for(let e of[-9,9])v(new s(.4,.4,6,6),Ji.dark,11.52+e,3,25);let b=new J(new z(34,8.5),new he({map:Sa([a,`${o} · ${c} m`],`#fbfaf5`,`#23303a`)}));return b.position.set(-17.28,13.6,10.299999999999999),u.add(b),u.userData.footprint={x:t,z:n,yaw:d,hw:60*l,hd:25.5*l},u}function wa(e,t,n,r,i){let a=new M,o=e.heightAt(t.x,t.z);a.position.set(t.x,o,t.z),a.rotation.y=Math.atan2(n.x,n.z);let c=H({color:i},{rim:1});for(let e of[-9,9]){let t=new J(new s(.6,.75,6.5,8).translate(0,3.25,0),c);t.position.x=e,t.castShadow=!0,a.add(t)}let l=new J(new B(20,2.6,.9),c);l.position.y=7.2,l.castShadow=!0;let u=Sa(r,`#fbfaf5`,`#23303a`),d=new J(new z(14,3.5),new he({map:u}));d.position.set(0,7.2,.5);let f=d.clone();return f.rotation.y=Math.PI,f.position.z=-.5,a.add(l,d,f),a}var Ta={zenith:new R(`#6dbbb8`),horizon:new R(`#bfe2da`),cloudLight:new R(`#e8f5ef`),cloudDark:new R(`#58a7a8`)};function Ea(){let e=new A({side:1,depthWrite:!1,fog:!1,uniforms:{uZenith:{value:Ta.zenith},uHorizon:{value:Ta.horizon},uCloudLight:{value:Ta.cloudLight},uCloudDark:{value:Ta.cloudDark},uTime:{value:0},uFloat:{value:0}},vertexShader:`
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,fragmentShader:`
      uniform vec3 uZenith, uHorizon, uCloudLight, uCloudDark;
      uniform float uTime;
      uniform float uFloat;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float s = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
        return s;
      }
      void main() {
        vec3 d = normalize(vDir);
        d.y = mix(d.y, abs(d.y), uFloat);
        float h = max(d.y, 0.0);
        vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
        col = mix(col, uZenith, uFloat * 0.35);
        if (d.y > 0.0) {
          vec2 uv = d.xz / (d.y + 0.18);
          uv = vec2(uv.x * 0.55, uv.y * 1.3) + vec2(uTime * 0.004, 0.0);
          // Domain warp gives the swirled, brushed look.
          vec2 warp = vec2(fbm(uv * 0.9 + 3.1), fbm(uv * 0.9 + 8.4));
          float n = fbm(uv * 1.1 + warp * 1.2);
          float fade = smoothstep(0.0, 0.25, d.y);
          float light = smoothstep(0.56, 0.575, n) * fade;
          float dark = smoothstep(0.6, 0.615, fbm(uv * 1.6 + warp * 1.6 + 5.0)) * (1.0 - light) * fade;
          col = mix(col, uCloudDark, dark * 0.55);
          col = mix(col, uCloudLight, light * 0.85);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`}),t=new J(new l(1e3,32,16),e);return t.frustumCulled=!1,t.renderOrder=-1,t}var Da=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,Oa=`
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2 uRes;
uniform float uNear;
uniform float uFar;
uniform float uPixelRatio;
uniform float uDepthScale;
uniform float uLineWidth;
uniform float uLineOpacity;
uniform vec3 uInk;
uniform vec3 uFogInk;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float viewDepth(vec2 uv) {
  float z = texture2D(tDepth, uv).x;
  return -perspectiveDepthToViewZ(z, uNear, uFar) * uDepthScale;
}
vec3 nrm(vec2 uv) {
  vec3 n = texture2D(tNormal, uv).xyz * 2.0 - 1.0;
  return n / max(length(n), 0.001);
}
float crease(vec3 centre, vec2 uv, float dc) {
  // A different depth surface belongs to the silhouette pass. Comparing its
  // normal as well paints a second, displaced contour (especially on hair).
  float dz = abs(viewDepth(uv) - dc) / max(dc, 0.001);
  float sameSurface = 1.0 - smoothstep(0.008, 0.025, dz);
  float covered = step(0.5, texture2D(tNormal, vUv).a) * step(0.5, texture2D(tNormal, uv).a);
  return (1.0 - clamp(dot(centre, nrm(uv)), -1.0, 1.0)) * sameSurface * covered;
}

void main() {
  vec2 px = 1.0 / uRes;
  float dc = viewDepth(vUv);
  // Radius in CSS pixels, independent of DPR. Keep sampling fixed in time:
  // moving it at 6 Hz used to make even a stationary model's outline jump.
  float near = 1.0 - smoothstep(4.0, 260.0, dc);
  float w = mix(0.65, 0.95, near) * uLineWidth * uPixelRatio;
  vec2 o = vec2(w) * px;

  float dl = viewDepth(vUv - vec2(o.x, 0.0));
  float dr = viewDepth(vUv + vec2(o.x, 0.0));
  float dd = viewDepth(vUv - vec2(0.0, o.y));
  float du = viewDepth(vUv + vec2(0.0, o.y));
  // Keep the near-surface half of the Laplacian: abs() marked both sides,
  // doubling the band and leaving a halo outside the actual model.
  float lap = max(0.0, dl + dr + dd + du - 4.0 * dc) / max(dc, 0.001);
  float depthEdge = smoothstep(0.035, 0.09, lap);

  vec3 nc = nrm(vUv);
  float ndiff = 0.0;
  ndiff += crease(nc, vUv - vec2(o.x, 0.0), dc);
  ndiff += crease(nc, vUv + vec2(o.x, 0.0), dc);
  ndiff += crease(nc, vUv - vec2(0.0, o.y), dc);
  ndiff += crease(nc, vUv + vec2(0.0, o.y), dc);
  float normalEdge = smoothstep(0.55, 0.95, ndiff) * (1.0 - smoothstep(150.0, 600.0, dc));

  float edge = max(depthEdge, normalEdge * 0.55);
  // Break long lines up a touch, like a dry pen.
  edge *= 0.75 + 0.25 * noise(vUv * uRes / uPixelRatio * 0.12);

  vec3 col = texture2D(tColor, vUv).rgb;
  // Distant lines fade toward the haze color instead of staying black.
  float far = smoothstep(800.0, 14000.0, dc);
  vec3 ink = mix(uInk, uFogInk, far);
  col = mix(col, ink, edge * uLineOpacity * mix(1.0, 0.6, far));

  // Paper grain + soft vignette.
  vec2 sc = gl_FragCoord.xy / uPixelRatio;
  float grain = hash(floor(sc * 0.5)) - 0.5;
  col *= 1.0 + grain * 0.05;
  float vig = smoothstep(1.25, 0.45, length(vUv - 0.5) * 1.6);
  col *= mix(0.9, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`,ka=class{constructor(e,{depthScale:t=1,lineWidth:n=1,lineOpacity:r=.72}={}){this.renderer=e;let a={type:d};this.colorRT=new _(1,1,{...a,samples:4}),this.colorRT.depthTexture=new C(1,1,i),this.normalRT=new _(1,1,{...a,samples:4}),this.normalMat=new ge({side:2}),this.material=new A({vertexShader:Da,fragmentShader:Oa,uniforms:{tColor:{value:this.colorRT.texture},tDepth:{value:this.colorRT.depthTexture},tNormal:{value:this.normalRT.texture},uRes:{value:new N(1,1)},uNear:{value:.1},uFar:{value:1e3},uPixelRatio:{value:1},uDepthScale:{value:t},uLineWidth:{value:n},uLineOpacity:{value:r},uInk:{value:new R(`#1f2a33`)},uFogInk:{value:new R(`#5d8f97`)}},depthTest:!1,depthWrite:!1}),this.quad=new J(new z(2,2),this.material),this.quad.frustumCulled=!1,this.quadScene=new Xe,this.quadScene.add(this.quad),this.quadCam=new F(-1,1,1,-1,0,1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);this.colorRT.setSize(r,i),this.normalRT.setSize(r,i),this.material.uniforms.uRes.value.set(r,i),this.material.uniforms.uPixelRatio.value=n}render(e,t,n,r=[]){let i=this.renderer;i.setRenderTarget(this.colorRT),i.render(e,t);let a=e.background,o=e.fog;e.background=null,e.fog=null,e.overrideMaterial=this.normalMat;let s=new Map(r.map(e=>[e,e.visible]));e.traverse(e=>{(e.isSprite||e.isLine||e.isPoints||e.isMesh&&!e.geometry.attributes.normal)&&(s.has(e)||s.set(e,e.visible))});for(let e of s.keys())e.visible=!1;let c=i.getClearColor(new R),l=i.getClearAlpha();i.setClearColor(0,0),i.setRenderTarget(this.normalRT),i.clear();let u=i.shadowMap.autoUpdate;i.shadowMap.autoUpdate=!1,i.render(e,t),i.shadowMap.autoUpdate=u;for(let[e,t]of s)e.visible=t;i.setClearColor(c,l),e.overrideMaterial=null,e.background=a,e.fog=o;let d=this.material.uniforms;d.uNear.value=t.near,d.uFar.value=t.far,i.setRenderTarget(null),i.render(this.quadScene,this.quadCam)}},Aa=`modulepreload`,ja=function(e,t){return new URL(e,t).href},Ma={},Na=function(e){return e.pathname.endsWith(`.css`)},Pa=function(e,t,n){if(t in e)return e[t];let r=n();if(!r){e[t]=void 0;return}let i=r.then(()=>{e[t]=void 0},n=>{throw e[t]=void 0,n});return e[t]=i,i},Fa=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e,i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}r=o(t.map(t=>{t=ja(t,n);let r=s(t),i=Na(r);return Pa(Ma,r.href,()=>{if(e===void 0){e={all:new Set,styles:new Set};let t=document.getElementsByTagName(`link`);for(let n=t.length-1;n>=0;n--){let r=t[n];e.all.add(r.href),r.rel===`stylesheet`&&e.styles.add(r.href)}}if((i?e.styles:e.all).has(r.href))return;let t=document.createElement(`link`);if(t.rel=i?`stylesheet`:Aa,i||(t.as=`script`),t.crossOrigin=``,t.href=r.href,a&&t.setAttribute(`nonce`,a),document.head.appendChild(t),i)return new Promise((e,n)=>{t.addEventListener(`load`,e),t.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${r}`)))})})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},Ia={cream:`#efe9dc`,navy:`#1e2536`,black:`#1c1d21`,skin:`#f6dcc6`,hair:`#5b3b28`,hairDark:`#452d1f`,lens:`#3d4a5c`,lensGlint:`#d9553a`,yellow:`#f2c83a`,orange:`#ff5a1f`,board:`#ee4f2c`,boardBase:`#c63b22`,piping:`#f7f5ee`,patch:`#b9b4aa`},Q=Object.fromEntries(Object.entries(Ia).map(([e,t])=>[e,H({color:t},{rim:1,hatch:0})]));function La(){let e=document.createElement(`canvas`);e.width=512,e.height=256;let t=e.getContext(`2d`);t.fillStyle=Ia.skin,t.fillRect(0,0,512,256),t.fillStyle=`rgba(240,150,140,0.55)`;for(let e of[-40,40])t.beginPath(),t.ellipse(128+e,150,13,7,0,0,Math.PI*2),t.fill();t.fillStyle=`#16171a`;for(let e of[-25,25])t.beginPath(),t.ellipse(128+e,132,6.5,10,0,0,Math.PI*2),t.fill();t.strokeStyle=`#5a3a2a`,t.lineWidth=3,t.lineCap=`round`;for(let e of[-25,25])t.beginPath(),t.moveTo(128+e-8,112),t.lineTo(128+e+8,110),t.stroke();t.strokeStyle=`#7a3e34`,t.lineWidth=2.5,t.beginPath(),t.arc(128,152,7,.25*Math.PI,.75*Math.PI),t.stroke();let n=new Ce(e);return n.colorSpace=Qe,n.anisotropy=4,n}function Ra(){let e=document.createElement(`canvas`);e.width=128,e.height=256;let t=e.getContext(`2d`);t.fillStyle=Ia.black,t.fillRect(0,0,128,256),t.save(),t.translate(78,128),t.rotate(-Math.PI/2),t.fillStyle=`#e9e6de`,t.font=`600 30px "Patrick Hand SC", sans-serif`,t.textAlign=`center`,t.textBaseline=`middle`,t.fillText(`SALONION`,0,0),t.restore();let n=new Ce(e);return n.colorSpace=Qe,n}var za=new f(0,1,0),Ba=new f(0,-1,0),Va=.22,Ha=.25,Ua={seat:.15,pivot:.04,shoulder:[.26,.43],reach:.47};function Wa(e,t,n){let[r,i]=e.shoulder,a=t.y+e.pivot;for(let o=.15;o<1.2;o+=.02)if(Math.hypot(Math.abs(n.x)-r,n.y-(a+i*Math.cos(o)),n.z-(t.z+i*Math.sin(o)))<e.reach*.95)return o;return 1.2}function $(e,t,n,r=0,i=0,a=0){let o=new J(e,t);return o.position.set(r,i,a),o.castShadow=!0,n.add(o),o}var Ga=class{constructor(e,t,n,r,{top:i,pipe:a}={}){this.mesh=$(new s(n,t,1,8).translate(0,.5,0),r,e),i&&$(new s(n*1.07,n*1.04,i.len,10,1,!1,-1.9,3.8).translate(0,1-i.len/2,0),i.mat,this.mesh),a&&$(new B(.018,.9,.02).translate(0,.5,0),a.mat,this.mesh,a.side*n*1.02,0,0)}set(e,t){let n=new f().subVectors(t,e),r=n.length();this.mesh.position.copy(e),this.mesh.quaternion.setFromUnitVectors(za,n.divideScalar(r||1)),this.mesh.scale.set(1,r,1)}};function Ka(){let e=1.56,t=.52,n=new B(.27,.025,e,6,1,40),r=n.attributes.position;for(let n=0;n<r.count;n++){let i=r.getZ(n),a=Math.max(0,Math.abs(i)-t),o=a/(e/2-t),s=(1-.06*Math.cos(i/e*Math.PI)**2)*Math.sqrt(Math.max(.05,1-o**4));r.setX(n,r.getX(n)*s),r.setY(n,r.getY(n)+a*a*1.1)}return n.computeVertexNormals(),n}var qa=class{constructor({model:e=!1}={}){this.root=new M,this.edge=new M,this.root.add(this.edge),this.proceduralBoard=new M,this.edge.add(this.proceduralBoard),this.board=$(Ka(),Q.board,this.proceduralBoard,0,0,0),this.board.receiveShadow=!0;let t=$(new B(.24,.006,1),Q.boardBase,this.proceduralBoard,0,-.002,0);t.castShadow=!1,this.body=new M,this.body.rotation.y=Math.PI/2,this.edge.add(this.body),this.classic=new M,this.body.add(this.classic),this.bindings=[],this.boots=[],this.#t(),this.stance=this.feet.map(e=>e.position.clone()),this.seat=null,this.pose={crouch:.4,lean:0,twist:0,armSwing:0,air:0,tumble:0},this.t=0,this.model=null,this.modelId=`classic`,this.locomotion=`ride`,this.models=new Map,this.selection=0,e&&this.selectModel(e===!0?`male`:e).catch(e=>console.warn(`Rider model unavailable.`,e))}async selectModel(e){let t=++this.selection,n=null;if(e!==`classic`&&(this.models.has(e)||this.models.set(e,Fa(async()=>{let{loadRiderModel:e,RiderModel:t}=await import(`./rider-model-DOt_eWSR.js`);return{loadRiderModel:e,RiderModel:t}},__vite__mapDeps([0,1]),import.meta.url).then(async({loadRiderModel:t,RiderModel:n})=>new n(await t(e),e)).catch(t=>{throw this.models.delete(e),t})),n=await this.models.get(e),e===`female`&&!this.boardAssembly&&(this.boardLoading||=Fa(async()=>{let{loadBoardAssembly:e}=await import(`./rider-board-B9ChWtH_.js`);return{loadBoardAssembly:e}},__vite__mapDeps([2,1]),import.meta.url).then(({loadBoardAssembly:e})=>e(this)).catch(e=>{throw this.boardLoading=null,e}),this.boardAssembly=await this.boardLoading)),t!==this.selection)return!1;this.locomotion!==`sit`&&this.setLocomotion(`ride`),this.model&&this.body.remove(this.model.root),this.model=n,this.modelId=e,n&&this.body.add(n.root),this.classic.visible=!n;for(let e of this.boots)e.visible=!n;return this.#e(),!0}setLocomotion(e,t=this.seat){return e===`walk`&&!this.model?.canWalk||e===`sit`&&!t?!1:(this.seat=t,e!==`sit`&&this.feet.forEach((e,t)=>e.position.copy(this.stance[t])),this.locomotion=e,this.#e(),!0)}#e(){let e=this.locomotion===`ride`;this.proceduralBoard.visible=e&&this.modelId!==`female`,this.boardAssembly&&(this.boardAssembly.visible=e&&this.modelId===`female`);for(let t of this.bindings)t.visible=e&&this.modelId!==`female`;for(let e of this.boots)e.visible=!this.model&&this.locomotion!==`walk`}#t(){let e=this.body;this.feet=[.26,-.26].map(t=>{let n=new M;return n.position.set(t,.025,0),e.add(n),this.boots.push($(new B(.17,.16,.33),Q.black,n,0,.09,.02),$(new B(.19,.05,.12),Q.orange,n,0,.15,.05),$(new B(.19,.04,.07),Q.orange,n,0,.12,.15)),this.bindings.push($(new B(.18,.035,.35),Q.orange,n,0,.015,.02)),this.bindings.push($(new B(.18,.26,.05),Q.orange,n,0,.17,-.16)),n});let t=this.classic;this.thighs=[1,-1].map(e=>new Ga(t,.135,.15,Q.navy,{top:{len:.55,mat:Q.cream},pipe:{side:e,mat:Q.piping}})),this.shins=[1,-1].map(e=>new Ga(t,.135,.14,Q.navy,{pipe:{side:e,mat:Q.piping}})),this.cuffs=[0,1].map(()=>$(new s(.145,.14,.08,9),Q.black,t)),this.knees=[0,1].map(()=>$(new l(.14,9,7),Q.navy,t)),this.hips=new M,t.add(this.hips),$(new l(.2,10,8).scale(1.25,.75,.95),Q.navy,this.hips),$(new l(.205,12,8,Math.PI/2-1.2,2.4,.5,1.6).scale(1.25,.75,.95),Q.cream,this.hips),this.torso=new M,this.torso.position.y=.04,this.hips.add(this.torso);let n=this.torso;$(new s(.245,.26,.2,12),Q.navy,n,0,.1,0),$(new xe(.225,.08,4,12),Q.cream,n,0,.3,0).scale.set(1.08,1,.95),$(new B(.014,.19,.02),Q.piping,n,0,.1,.258),$(new B(.012,.3,.02),Q.navy,n,0,.36,.215),$(new s(.13,.17,.11,12),Q.cream,n,0,.55,0),$(new l(.15,10,8).scale(1.2,.75,.8),Q.cream,n,0,.55,-.11);for(let e of[-.13,.13]){let t=$(new B(.032,.24,.02),Q.black,n,e,.42,.2);t.rotation.x=-.35}$(new B(.28,.025,.02),Q.black,n,0,.37,.222),$(new s(.04,.04,.02,14),Q.yellow,n,-.12,.44,.22).rotation.x=Math.PI/2,$(new B(.09,.13,.05),Q.black,n,.12,.31,.235),$(new B(.02,.07,.01),Q.orange,n,.12,.31,.262),$(new B(.38,.46,.17),Q.black,n,0,.31,-.27),$(new B(.4,.1,.19),Q.black,n,0,.53,-.27);for(let e of[-.195,.195])$(new B(.02,.07,.03),Q.orange,n,e,.42,-.22),$(new B(.02,.06,.03),Q.orange,n,e,.18,-.22);let r=new J(new z(.17,.34),new he({map:Ra()}));r.position.set(0,.29,-.357),r.rotation.y=Math.PI,n.add(r),this.head=new M,this.head.position.y=.56,n.add(this.head);let i=this.head;$(new l(.19,24,16),H({map:La()},{rim:1,hatch:0}),i,0,.19,0).scale.set(1.04,1,.98);for(let e of[-1,1])$(new l(.042,8,6),Q.skin,i,e*.19,.17,0);$(new l(.203,18,12,Math.PI/2+.95,Math.PI*2-1.9,0,Math.PI*.64),Q.hair,i,0,.195,-.004).scale.set(1.06,1.02,1.04);let a=(e,t,n,r,a,o,s=Q.hair)=>{$(new k(.045*o,.13*o,5).rotateX(Math.PI),s,i,e,t,n).rotation.set(r,0,a)};for(let e=-3;e<=3;e++){let t=e*.21;a(Math.sin(t)*.18,.265-Math.abs(e)*.008,Math.cos(t)*.18,-.55,-t*.6,1-Math.abs(e)*.06,e%2?Q.hairDark:Q.hair)}for(let e of[-1,1])a(e*.2,.21,.06,.1,e*.9,1.1),a(e*.21,.16,-.04,-.1,e*1.4,1,Q.hairDark),a(e*.15,.09,-.14,.7,e*1.1,1.1);a(0,.07,-.18,1.1,0,1.2),$(new l(.222,20,12,0,Math.PI*2,0,Math.PI*.47),Q.cream,i,0,.22,-.012).scale.set(1.05,1.3,1.08),$(new l(.15,12,9),Q.cream,i,0,.42000000000000004,-.07).scale.set(1.2,.85,1.2);let o=$(new S(.228,.012,5,28),Q.black,i,0,.29000000000000004,-.01);o.rotation.x=Math.PI/2+.18,o.scale.set(1.04,1.07,1);for(let e of[-1,1]){let t=$(new S(.024,.006,5,12),Q.piping,i,e*.24,.28500000000000003,-.03);t.rotation.y=Math.PI/2}let c=new M;c.position.set(0,.32,-.01),c.rotation.x=-.18,i.add(c),$(new s(.236,.236,.125,18,1,!0,-.82,1.64),Q.black,c),$(new s(.243,.243,.095,18,1,!0,-.74,1.48),Q.lens,c),$(new B(.12,.01,.012),Q.lensGlint,c,.07,.02,.233).rotation.z=-.12,$(new B(.07,.008,.012),Q.lensGlint,c,-.09,-.015,.226).rotation.z=-.12;let u=e=>{let t=new M;t.position.set(.26*e,.43,0),n.add(t),$(new l(.105,9,7),Q.cream,t),$(new s(.095,.1,.22,9).translate(0,-.11,0),Q.cream,t);let r=new M;return r.position.y=-.22,t.add(r),$(new l(.098,9,7),Q.navy,r),$(new s(.105,.1,.2,9).translate(0,-.1,0),Q.navy,r),$(new l(.085,9,7).scale(.95,1.15,.85),Q.black,r,0,-.25,.01),{sh:t,el:r}};this.armL=u(1),this.armR=u(-1),$(new B(.01,.07,.08),Q.patch,this.armL.sh,.1,-.08,0)}update(e,t){this.t+=e;let n=this.pose,r=1-Math.exp(-e*10);n.crouch+=(t.crouch-n.crouch)*r,n.lean+=(t.lean-n.lean)*(1-Math.exp(-e*8)),n.twist+=(t.twist-n.twist)*r,n.air+=(+!!t.air-n.air)*(1-Math.exp(-e*6));let i=this.locomotion===`sit`;i?this.#r(n):this.#n(n);let a=new f(0,0,1);this.kneeOut=i?.45:.12;for(let e=0;e<2;e++){let t=e===0?1:-1,n=new f(.12*t,0,0).applyEuler(this.hips.rotation).add(this.hips.position),r=this.feet[e].position.clone().add(new f(0,.15,0)),i=.3,o=n.clone().sub(r),s=Math.min(o.length(),2*i-.001),c=r.clone().addScaledVector(o.normalize(),s/2),l=a.clone().addScaledVector(o,-a.dot(o)).normalize();l.x+=t*this.kneeOut,l.normalize();let u=c.addScaledVector(l,Math.sqrt(i*i-(s/2)**2));this.thighs[e].set(u,n),this.shins[e].set(r,u),this.knees[e].position.copy(u),this.cuffs[e].position.copy(r).add(new f(0,.02,0))}i&&(this.#i(this.armL,this.seat.grips[0],1),this.#i(this.armR,this.seat.grips[1],-1)),this.body.rotation.x=n.tumble;let o=this.locomotion===`walk`,s=o||i?Math.PI:Math.PI/2;this.body.rotation.y+=(s-this.body.rotation.y)*Math.min(1,e/.08),(o||i)&&(this.edge.rotation.z=0,this.body.rotation.x=0),this.model?.update(e,this,this.locomotion,t.speed||0)}#n(e){this.edge.rotation.z=e.lean;let t=Math.min(1,e.crouch+e.air*.35),n=.76-t*.24;this.hips.position.set(.02,n,-.1-t*.08),this.hips.rotation.set(0,.3+e.twist*.3,0),this.torso.rotation.set(.45+t*.45,.25+e.twist*.25,0),this.head.rotation.set(-.3-t*.35,.55-e.twist*.3,0);let r=Math.sin(this.t*2.1)*.05,i=e.air,a=this.armL,o=this.armR;a.sh.rotation.set(-.5-e.lean*.6-i*.6,0,1.15-i*.5+r),a.el.rotation.set(-.35,0,.1),o.sh.rotation.set(-.9+e.lean*.5-i*.4,0,-.75+i*.2-r),o.el.rotation.set(-1-i*.4,0,-.2)}#r(e){let t=this.seat,n=this.model?.build??Ua;this.hips.position.copy(t.hips),this.hips.position.y+=n.seat,this.hips.rotation.set(0,0,0);let r=Wa(n,this.hips.position,t.grips[0]);this.torso.rotation.set(r,e.twist*.12,-e.lean),this.head.rotation.set(-r*.85,-e.twist*.15,e.lean*.6),this.feet.forEach((e,n)=>e.position.copy(t.feet[n]))}#i(e,t,n){this.body.updateMatrixWorld(!0);let r=this.body.worldToLocal(e.sh.getWorldPosition(new f)),i=t.clone().sub(r),a=Math.min(i.length(),.4699);i.normalize();let o=(Va**2-Ha**2+a**2)/(2*a),s=Math.sqrt(Math.max(0,Va**2-o**2)),c=new f(n*.8,-1,-.4);c.addScaledVector(i,-c.dot(i)).normalize();let l=r.clone().addScaledVector(i,o).addScaledVector(c,s),u=r.clone().addScaledVector(i,a),d=this.hips.quaternion.clone().multiply(this.torso.quaternion).invert();e.sh.quaternion.setFromUnitVectors(Ba,l.clone().sub(r).normalize().applyQuaternion(d)),d.premultiply(e.sh.quaternion.clone().invert()),e.el.quaternion.setFromUnitVectors(Ba,u.sub(l).normalize().applyQuaternion(d))}},Ja=14;function Ya(e,t,n){let r=document.createElement(`canvas`);r.width=e,r.height=t,n(r.getContext(`2d`),e,t);let i=new Ce(r);return i.colorSpace=Qe,i.anisotropy=8,i}function Xa(){let e=[[0,`#5d6264`],[.16,`#6f7472`],[.3,`#7d6a5a`],[.44,`#8f7a63`],[.56,`#a48a6c`],[.68,`#8c735d`],[.8,`#a79680`],[.9,`#7f6a58`]],t=Ya(512,1024,(t,n,r)=>{e.forEach(([i,a],o)=>{let s=o+1<e.length?e[o+1][0]:1.01;t.fillStyle=a,t.beginPath();for(let e=0;e<=n;e+=8){let a=Math.sin(e/n*Math.PI*2*(2+o))*.012+Math.sin(e/n*Math.PI*2*5+o)*.006;t[e?`lineTo`:`moveTo`](e,r-(i+(o?a:-.1))*r)}for(let e=n;e>=0;e-=8){let i=Math.sin(e/n*Math.PI*2*(3+o))*.012+Math.sin(e/n*Math.PI*2*4+o)*.006;t.lineTo(e,r-(s+i)*r)}t.fill()});let i=7,a=()=>(i=i*16807%2147483647)/2147483647;for(let e=0;e<260;e++){let e=a()*n,i=a()*r;t.fillStyle=a()>.5?`rgba(40,46,52,0.35)`:`rgba(250,245,235,0.25)`,t.beginPath(),t.ellipse(e,i,2+a()*6,1.5+a()*3,a()*3,0,Math.PI*2),t.fill()}});return t.wrapS=Re,t}function Za(){let e=Ya(1024,128,(e,t,n)=>{e.fillStyle=`#7a5640`,e.fillRect(0,0,t,n);for(let r=0;r<46;r++){let i=r/46*n;e.strokeStyle=r%3?`rgba(60,38,26,0.25)`:`rgba(150,110,80,0.25)`,e.lineWidth=1+r%4,e.beginPath();for(let n=0;n<=t;n+=16)e[n?`lineTo`:`moveTo`](n,i+Math.sin(n*.006+r)*4+Math.sin(n*.031+r*2)*1.5);e.stroke()}});return e.wrapS=e.wrapT=Re,e}function Qa(e,t){return Ya(2048,160,(n,r,i)=>{let a=n.createLinearGradient(0,0,0,i);a.addColorStop(0,`#e7c873`),a.addColorStop(1,`#c9a24f`),n.fillStyle=a,n.fillRect(0,0,r,i),n.strokeStyle=`#6d5124`,n.lineWidth=6,n.strokeRect(10,10,r-20,i-20),n.fillStyle=`#3b2c14`,n.textAlign=`center`,n.textBaseline=`middle`,n.font=`700 70px "Patrick Hand SC", "PingFang SC", sans-serif`,n.fillText(e,r/2,62),n.font=`38px "Patrick Hand SC", "PingFang SC", sans-serif`,n.fillText(t,r/2,118)})}function $a(){return Ya(256,256,e=>{e.fillStyle=`#d8b863`,e.beginPath(),e.arc(128,128,124,0,Math.PI*2),e.fill(),e.strokeStyle=`#6d5124`,e.lineWidth=6,e.beginPath(),e.arc(128,128,112,0,Math.PI*2),e.stroke(),e.fillStyle=`#3b2c14`,e.beginPath(),e.moveTo(128,34),e.lineTo(156,140),e.lineTo(128,124),e.lineTo(100,140),e.closePath(),e.fill(),e.font=`700 54px "Patrick Hand SC", sans-serif`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(`N`,128,186)})}function eo(e,t,n,r,i,a){let o=[],s=[],c=[],{verts:l,size:u,cells:d,x0:p,z0:m}=e,h=0,g=null;t.forEach((t,n)=>{let f=p+t%l/d*u,_=m+Math.floor(t/l)/d*u;g&&(h+=Math.hypot(f-g[0],_-g[1])),g=[f,_];let v=r(e.h[t]),y=i(e.h[t]);if(o.push(f,v,_,f,y,_),s.push(h/1600,a(v),h/1600,a(y)),n){let e=n*2;c.push(e-2,e-1,e,e,e-1,e+1)}});let _=new G;if(_.setAttribute(`position`,new et(o,3)),_.setAttribute(`uv`,new et(s,2)),_.setIndex(c),_.computeVertexNormals(),new f().fromBufferAttribute(_.attributes.normal,0).dot(n)<0){let e=_.index.array;for(let t=0;t<e.length;t+=3)[e[t+1],e[t+2]]=[e[t+2],e[t+1]];_.computeVertexNormals()}return _}function to(e,{baseY:t,top:n,title:r,subtitle:i}){let a=new M,o=e.verts,s=[{ks:[...Array(o).keys()],out:new f(0,0,-1)},{ks:[...Array(o).keys()].map(e=>(o-1)*o+e),out:new f(0,0,1)},{ks:[...Array(o).keys()].map(e=>e*o),out:new f(-1,0,0)},{ks:[...Array(o).keys()].map(e=>e*o+o-1),out:new f(1,0,0)}],c=H({map:Xa()},{hatch:1}),l=H({color:`#f4f6f1`},{hatch:1}),u=e=>(e-t)/(n-t);for(let n of s){let r=new J(eo(e,n.ks,n.out,e=>e+.5,e=>e-Ja,u),l),i=new J(eo(e,n.ks,n.out,e=>e-Ja,()=>t,u),c);i.receiveShadow=r.receiveShadow=!0,a.add(r,i)}let d=Za(),p=H({map:d,color:`#b89a86`},{hatch:1}),m=e.size,h=[{w:m+260,h:170,y:t},{w:m+520,h:120,y:t-170}];for(let e of h){let t=new J(new B(e.w,e.h,e.w),p);t.position.y=e.y-e.h/2,t.receiveShadow=!0,t.castShadow=!0,a.add(t)}let g=new J(new z(2400,150),H({map:Qa(r,i)},{hatch:0}));g.position.set(0,t-85,(m+260)/2+1.5),a.add(g);let _=new J(new de(95,40),H({map:$a()},{hatch:0}));_.rotation.x=-Math.PI/2,_.position.set(m/2+65,t+1.5,m/2+65),_.scale.setScalar(.55),a.add(_);let v=Ya(256,256,e=>{let t=e.createRadialGradient(128,128,30,128,128,128);t.addColorStop(0,`rgba(20,50,55,0.38)`),t.addColorStop(.55,`rgba(20,50,55,0.18)`),t.addColorStop(1,`rgba(20,50,55,0)`),e.fillStyle=t,e.fillRect(0,0,256,256)}),y=new J(new z(m*2.1,m*2.1),new he({map:v,transparent:!0,depthWrite:!1}));return y.rotation.x=-Math.PI/2,y.position.y=t-290-2,y.renderOrder=-1,a.add(y),{group:a,shadow:y,floorY:t-290}}function no(e){return()=>(e=e*16807%2147483647)/2147483647}function ro(e,t,{min:n,max:r,treeline:i}){let a=new M,o=n-260,s=3400,c=e.verts,l=[{ks:[...Array(c).keys()],out:new f(0,0,-1)},{ks:[...Array(c).keys()].map(e=>(c-1)*c+e),out:new f(0,0,1)},{ks:[...Array(c).keys()].map(e=>e*c),out:new f(-1,0,0)},{ks:[...Array(c).keys()].map(e=>e*c+c-1),out:new f(1,0,0)}],u=H({map:Xa()},{hatch:1}),d=e=>(e-o)/(r-o);for(let t of l)a.add(new J(eo(e,t.ks,t.out,e=>e-119,()=>o,d),u));a.add(new J(ao(e,o,s),H({vertexColors:!0},{hatch:1}))),a.add(new J(io(e,t,i),H({vertexColors:!0},{hatch:1})));let p=e.center[0],m=e.center[1],h=no(29),g=H({color:`#857a6c`},{hatch:1}),_=new v(1,0),y=[];for(let e=0;e<7;e++){let t=e/7*Math.PI*2+h()*.6,n=120+h()*260,r=new J(_,g),i=5e3+h()*1400;r.position.set(p+Math.cos(t)*i,o-300-h()*1500,m+Math.sin(t)*i),r.scale.set(n,n*.75,n*.9),r.rotation.set(h()*3,h()*3,h()*3),r.userData.y=r.position.y,y.push(r),a.add(r)}let b=H({color:`#ffffff`},{hatch:0}),x=new v(1,2),S=[];for(let e=0;e<6;e++){let t=new M,n=4+Math.floor(h()*3);for(let e=0;e<n;e++){let r=new J(x,b),i=260+h()*320*(1-Math.abs(e/(n-1)-.5));r.scale.set(i,i*.8,i),r.position.set((e-(n-1)/2)*380,i*.25,(h()-.5)*300),t.add(r)}let i=e%2==0;t.userData={a:e/6*Math.PI*2+h()*.5,R:4300+h()*1300,y:i?r-500+h()*700:o-200+h()*900},S.push(t),a.add(t)}a.update=e=>{y.forEach((t,n)=>{t.position.y=t.userData.y+Math.sin(e*.35+n*1.7)*60,t.rotation.y+=6e-4});for(let t of S){let n=t.userData.a+e*.006;t.position.set(p+Math.cos(n)*t.userData.R,t.userData.y,m+Math.sin(n)*t.userData.R),t.rotation.y=-n}};let C=(r+o-s)/2;return a.userData={center:new f(p,C,m),radius:Math.hypot(e.half*Math.SQRT2,(r-(o-s))/2)},a.update(0),a}function io(e,t,n){let r=Math.floor(e.size/24),i=new f,a=new R,o=new R(`#3e5a4f`),s=new R(`#557a63`),c=[],l=[],u=[],d=new Map,p=(t,n)=>{let i=n*(r+1)+t;if(!d.has(i)){let r=e.x0+t*24,u=e.z0+n*24;d.set(i,c.length/3),c.push(r,e.heightAt(r,u)+14,u),a.copy(o).lerp(s,ki(r*.004,u*.004)),l.push(a.r,a.g,a.b)}return d.get(i)};for(let a=0;a<r;a++)for(let o=0;o<r;o++){let r=e.x0+(o+.5)*24,s=e.z0+(a+.5)*24;if(!e.inside(r,s,30)||e.holeAt(r,s)||e.heightAt(r,s)>n-60+(ki(r*.006,s*.006)-.5)*160||t.distAt(r,s)<22||e.normalAt(r,s,i).y<.78||ki(r*.012+40,s*.012)<.42)continue;let c=p(o,a),l=p(o+1,a),d=p(o,a+1),f=p(o+1,a+1);u.push(c,d,l,l,d,f)}let m=new G;return m.setAttribute(`position`,new et(c,3)),m.setAttribute(`color`,new et(l,3)),m.setIndex(u),m.computeVertexNormals(),m}function ao(e,t,n){let{x0:r,z0:i,size:a}=e,o=r+a/2,s=i+a/2,c=[];for(let e=0;e<4;e++)for(let t=0;t<7;t++){let n=t/7,[o,s]=[[n,0],[1,n],[1-n,1],[0,1-n]][e];c.push([r+o*a,i+s*a])}let l=no(7),u=[];for(let e=0;e<6;e++){let r=e/6,i=+!!e;u.push(c.map(([e,a])=>{let c=(1-r)**.75*(1+(l()-.5)*.22*i),u=t-n*r**1.3+(l()-.5)*n*.07*i;return new f(o+(e-o)*c,u,s+(a-s)*c)}))}let d=new f(o+180,t-n,s-120),p=[`#8f7a63`,`#7d6a5a`,`#6f7472`,`#5d6264`,`#6a6e6c`,`#585d60`].map(e=>new R(e)),m=[],h=[],g=new f,_=new f,v=new f,y=new f,b=new R,x=(e,t,n,r)=>{g.crossVectors(_.subVectors(t,e),v.subVectors(n,e)),y.addVectors(e,t).add(n).divideScalar(3),g.x*(y.x-o)+g.z*(y.z-s)<0&&([t,n]=[n,t]),b.copy(p[Math.min(r,p.length-1)]).multiplyScalar(.9+l()*.2);for(let r of[e,t,n])m.push(r.x,r.y,r.z),h.push(b.r,b.g,b.b)},S=c.length;for(let e=0;e<6;e++)for(let t=0;t<S;t++){let n=u[e][t],r=u[e][(t+1)%S];if(e===5){x(n,r,d,e);continue}let i=u[e+1][t],a=u[e+1][(t+1)%S];x(n,r,i,e),x(r,a,i,e)}let C=new G;return C.setAttribute(`position`,new et(m,3)),C.setAttribute(`color`,new et(h,3)),C.computeVertexNormals(),C}var oo={H:[[4.35,0,5.65,3.9],[4.35,6.1,5.65,10]],E:[[3.3,2.55,10,3.85],[3.3,6.15,10,7.45]],M:[[2.8,3.3,4.1,10],[5.9,3.3,7.2,10]],U:[[4.35,0,5.65,6.9]],S:[[3,2.55,10,3.85],[0,6.15,7,7.45]],K:[[3,0,4.3,3.9],[3,6.1,4.3,10],[6.3,4.35,10,5.65]],I:[[0,2.6,3.4,7.4],[6.6,2.6,10,7.4]]},so=[`HEMU`,`SKI`],co=10,lo=1.8,uo=7.5,fo=43.9,po=21.3,mo=Object.fromEntries(Object.entries({cream:`#f7f2e4`,slot:`#4d6467`,top:`#efe9d8`,left:`#ddd5c1`,right:`#bfb6a1`,bottom:`#a39a87`,back:`#8f877a`}).map(([e,t])=>[e,new R(t)]));function ho(e,t){let n=e.attributes.normal,r=new Float32Array(n.count*3);for(let e=0;e<n.count;e++){let i=n.getX(e),a=n.getY(e),o=n.getZ(e),s=o>.5?t?mo.slot:mo.cream:o<-.5?mo.back:a>.5?mo.top:a<-.5?mo.bottom:i<0?mo.left:mo.right;r.set([s.r,s.g,s.b],e*3)}return e.setAttribute(`color`,new V(r,3)),e}function go(e){let t=(t,n)=>[...new Set([0,co,...e.flatMap(e=>[e[t],e[n]])])].sort((e,t)=>e-t),n=t(0,2),r=t(1,3),i=[ho(new B(co,co,uo).translate(0,0,-7.5/2),!0)];for(let t=0;t<n.length-1;t++)for(let a=0;a<r.length-1;a++){let o=(n[t]+n[t+1])/2,s=(r[a]+r[a+1])/2;if(e.some(([e,t,n,r])=>o>e&&o<n&&s>t&&s<r))continue;let c=new B(n[t+1]-n[t],r[a+1]-r[a],lo);i.push(ho(c.translate(o-co/2,co/2-s,lo/2),!1))}return Be(i)}var PX={A:`.###.|#...#|#...#|#####|#...#|#...#|#...#`,B:`####.|#...#|#...#|####.|#...#|#...#|####.`,C:`.####|#....|#....|#....|#....|#....|.####`,D:`####.|#...#|#...#|#...#|#...#|#...#|####.`,F:`#####|#....|#....|####.|#....|#....|#....`,G:`.####|#....|#....|#..##|#...#|#...#|.###.`,J:`..###|....#|....#|....#|....#|#...#|.###.`,L:`#....|#....|#....|#....|#....|#....|#####`,N:`#...#|##..#|#.#.#|#..##|#...#|#...#|#...#`,O:`.###.|#...#|#...#|#...#|#...#|#...#|.###.`,P:`####.|#...#|#...#|####.|#....|#....|#....`,Q:`.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#`,R:`####.|#...#|#...#|####.|#.#..|#..#.|#...#`,T:`#####|..#..|..#..|..#..|..#..|..#..|..#..`,V:`#...#|#...#|#...#|#...#|#...#|.#.#.|..#..`,W:`#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#`,X:`#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#`,Y:`#...#|#...#|.#.#.|..#..|..#..|..#..|..#..`,Z:`#####|....#|...#.|..#..|.#...|#....|#####`};function px(l){let r=(PX[l]||`.....|.....|.....|.....|.....|.....|.....`).split(`|`),s=[];r.forEach((w,y)=>[...w].forEach((c,x)=>{c!==`#`&&s.push([x*2,y*10/7,x*2+2,(y+1)*10/7])}));return s}function _o(T){let W=(Math.max(...(T||so).map(e=>e.length))-1)*11.3+10,e=new M,t=new M;e.add(t);let n=new he({vertexColors:!0,fog:!1}),r=no(3),i=[];(T||so).forEach((e,a)=>[...e].forEach((o,s)=>{if(o===` `)return;let c=new J(go(oo[o]||px(o)),n);c.position.set((s-(e.length-1)/2)*11.3,(.5-a)*11.3,0),c.userData={home:c.position.clone(),tilt:new h((r()-.5)*.1,(r()-.5)*.14,(r()-.5)*.08),phase:r()*Math.PI*2,v:new f,w:new f,delay:0},t.add(c),i.push(c)}));let a=-1;return{group:e,update(n,r,o,s,c){if(!e.visible)return;let l=1-Math.exp(-n*3);if(a<0){let n=2*s*Math.tan(U.degToRad(o.fov)/2),a=Math.min(.56*n*o.aspect/W,.34*n/po);e.position.set(0,n*.08,-s),e.scale.setScalar(a),t.rotation.x+=(.22-c.y*.14-t.rotation.x)*l,t.rotation.y+=(c.x*.28-t.rotation.y)*l;for(let e of i){let{home:t,tilt:n,phase:i}=e.userData;e.position.y=t.y+Math.sin(r*1.1+i)*.25,e.rotation.set(n.x+Math.sin(r*.7+i)*.025,n.y,n.z)}}else{a+=n;for(let e of i){let t=e.userData;a<t.delay||(t.v.y-=70*n,e.position.addScaledVector(t.v,n),e.rotation.x+=t.w.x*n,e.rotation.y+=t.w.y*n,e.rotation.z+=t.w.z*n)}a>2.4&&(e.visible=!1)}},leave(){a>=0||(a=0,i.forEach((e,t)=>{let n=e.userData;n.delay=t*.05+r()*.05,n.v.set(n.home.x*1.6+(r()-.5)*14,22+n.home.y*1.5+r()*14,4+r()*8),n.w.set((r()-.5)*7,(r()-.5)*7,(r()-.5)*5)}))}}}function vo(e=150){let t=no(41),n=[],r=new Float32Array(e*3),i=new Float32Array(e);for(let r=0;r<e;r++)n.push({u:t()*2.3-1.15,v:t()*2.3-1.15,z:.2+t()*1.1,fall:.025+t()*.035,phase:t()*6.3}),i[r]=2.5+t()*t()*7;let a=new G;a.setAttribute(`position`,new V(r,3)),a.setAttribute(`aSize`,new V(i,1));let o=new A({uniforms:{uScale:{value:1},uOpacity:{value:1},uColor:{value:new R(`#f2faf6`)}},vertexShader:`
      attribute float aSize;
      uniform float uScale;
      void main() {
        gl_PointSize = aSize * uScale;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,fragmentShader:`
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        float a = 1.0 - smoothstep(0.3, 0.5, length(gl_PointCoord - 0.5));
        if (a <= 0.0) discard;
        gl_FragColor = vec4(uColor, a * uOpacity);
      }`,transparent:!0,depthWrite:!1}),s=new Ze(a,o);return s.frustumCulled=!1,{points:s,set opacity(e){o.uniforms.uOpacity.value=e,s.visible=e>0},update(e,i,c,l,u){if(!s.visible)return;let d=Math.tan(U.degToRad(c.fov)/2),f=d*c.aspect;n.forEach((n,a)=>{n.v-=n.fall*e,n.u+=Math.sin(i*.5+n.phase)*.012*e,n.v<-1.15&&(n.v=1.15,n.u=t()*2.3-1.15);let o=n.z*l;r.set([n.u*f*o,n.v*d*o,-o],a*3)}),a.attributes.position.needsUpdate=!0,o.uniforms.uScale.value=u}}}function yo(e){let t=[];for(let n=0;n<9;n++){let r=document.createElement(`i`);e.appendChild(r),t.push({el:r,a:n/9*Math.PI*2+Math.sin(n*7.1)*.4,r:.55+n*37%10/30,s:.75+n*53%10/25})}return n=>{if(e.style.visibility=n>0?`visible`:`hidden`,n<=0)return;let r=Math.max(window.innerWidth,window.innerHeight);for(let e of t){let t=(1-n)*e.r*r;e.el.style.transform=`translate(${Math.cos(e.a)*t}px, ${Math.sin(e.a)*t}px) scale(${e.s*(.5+n*1.1)})`}e.style.opacity=Math.min(1,n*2.5),e.style.backgroundColor=`rgba(251, 250, 245, ${U.smoothstep(n,.7,1)})`}}var bo=new Set([`bottom`,`top`,`ride`]);function xo(e){return e.kind===`run`?`run:${e.id}`:e.kind===`lift`?`lift:${e.id}:${e.end}`:`lodge:${e.id}`}function So(e){let[t,n,r]=String(e??``).split(`:`);return n?t===`run`||t===`lodge`?{kind:t,id:n}:t===`lift`?{kind:t,id:n,end:bo.has(r)?r:`bottom`}:null:null}var Co=()=>So(new URLSearchParams(location.search).get(`at`));function wo(e,t,n){let r=t.find(e=>String(e.id)===String(n));if(!r)return null;let i=r.name?t.filter(e=>e.name===r.name):[r],a=null;for(let t of i)for(let n of[0,t.points.length-1]){let[r,i]=t.points[n],o=e.heightAt(r,i);(!a||o>a.y)&&(a={run:t,x:r,y:o,z:i,points:n?[...t.points].reverse():t.points})}return a}var To=`hemu-ski.you`,Eo=6e5;function Do({x:e,z:t,bearing:n,lift:r}){return[Math.round(e),Math.round(t),Math.round(n),...r?[r]:[]].join(`,`)}function Oo(e){let[t,n,r,i]=String(e??``).split(`,`);return[t,n].every(e=>e!==``&&Number.isFinite(+e))?{x:+t,z:+n,bearing:+r||0,lift:i||null}:null}function ko(e){try{e?localStorage.setItem(To,JSON.stringify({at:Do(e),t:Date.now()})):localStorage.removeItem(To)}catch{}}function Ao(e){let t=(e,t)=>{try{let{at:n,t:r}=JSON.parse(e);return Date.now()-r<t?Oo(n):null}catch{return null}};window.addEventListener(`storage`,n=>{n.key===To&&e(n.newValue?t(n.newValue,1/0):null)});try{return t(localStorage.getItem(To),Eo)}catch{return null}}var jo=`hemu-ski.arriving`;function Mo(e){try{sessionStorage.setItem(jo,e)}catch{}}function No(){try{let e=sessionStorage.getItem(jo);return sessionStorage.removeItem(jo),e}catch{return null}}var Po={丁香道:[`Dingxiang`,`Lilac`],不冻泉道:[`Budongquan`,`Unfrozen Spring`],也麦盖特道:[`Yemaigaite`],云杉道:[`Yunshan`,`Spruce`],云湖道:[`Yunhu`,`Cloud Lake`],云霄峰道:[`Yunxiaofeng`,`Sky-High Peak`],五彩滩道:[`Wucaitan`,`Five-Colour Shoal`],五指泉道:[`Wuzhiquan`,`Five-Finger Spring`],伊雷木湖道:[`Yileimuhu`,`Yileimu Lake`],冷杉道:[`Lengshan`,`Fir`],卧龙湾道:[`Wolongwan`,`Sleeping Dragon Bay`],友谊峰道:[`Youyifeng`,`Friendship Peak`],双湖道:[`Shuanghu`,`Twin Lakes`],可可托海道:[`Keketuohai`,`Koktokay`],吉克普林道:[`Jikepulin`],响泉道:[`Xiangquan`,`Echoing Spring`],喀纳斯道:[`Kanasi`,`Kanas`],圣泉道:[`Shengquan`,`Holy Spring`],将军山道:[`Jiangjunshan`,`General's Mountain`],山楂道:[`Shanzha`,`Hawthorn`],巴丹莉道:[`Badanli`],干湖道:[`Ganhu`,`Dry Lake`],月亮湾道:[`Yueliangwan`,`Moon Bay`],望泉道:[`Wangquan`,`Spring View`],柳兰道:[`Liulan`,`Fireweed`],泰加林道:[`Taijialin`,`Taiga`],清泉道:[`Qingquan`,`Clear Spring`],滴水泉道:[`Dishuiquan`,`Dripping Spring`],狼山道:[`Langshan`,`Wolf Mountain`],白哈巴道:[`Baihaba`],白杨道:[`Baiyang`,`Poplar`],白桦道:[`Baihua`,`Birch`],白沙湖道:[`Baishahu`,`White Sand Lake`],白湖道:[`Baihu`,`White Lake`],盘古道:[`Pangu`],石泉道:[`Shiquan`,`Stone Spring`],神仙湾道:[`Shenxianwan`,`Immortals' Bay`],神石城道:[`Shenshicheng`,`Stone City`],禾木道:[`Hemu`],红柳道:[`Hongliu`,`Red Willow`],美丽峰道:[`Meilifeng`,`Beautiful Peak`],芍药道:[`Shaoyao`,`Peony`],花楸道:[`Huaqiu`,`Rowan`],蔷薇道:[`Qiangwei`,`Wild Rose`],蝴蝶泉道:[`Hudiequan`,`Butterfly Spring`],谷帘泉道:[`Gulianquan`,`Curtain Spring`],贾登峪道:[`Jiadengyu`],连接道:[`Lianjie`,`Connector`],野卡峡道:[`Yekaxia`,`Yeka Gorge`],金莲花道:[`Jinlianhua`,`Globeflower`],青格里道:[`Qinggeli`],静泉谷:[`Jingquangu`,`Quiet Spring Valley`],驼颈湾道:[`Tuojingwan`,`Camel's Neck Bay`],鸭泽湖道:[`Yazehu`,`Duck Marsh Lake`],黑湖道:[`Heihu`,`Black Lake`]},Fo={easy:{label:`Easy`,color:`#4f8fd6`,rank:0},novice:{label:`Novice`,color:`#4f8fd6`,rank:0},intermediate:{label:`Intermediate`,color:`#d9534a`,rank:1},advanced:{label:`Advanced`,color:`#23303a`,rank:2},expert:{label:`Expert`,color:`#23303a`,rank:3},freeride:{label:`Freeride`,color:`#f08a24`,rank:3}},Io={gondola:`Gondola`,chair_lift:`Chairlift`,magic_carpet:`Magic carpet`,drag_lift:`Drag lift`,"t-bar":`T-bar`};function Lo(e){let t=Io[e.type]||`Lift`,n=e.name&&e.name.match(/(\d+)号/);return{zh:e.name||`魔毯`,en:n?`${t} No. ${n[1]}`:t}}export{Pi as A,wa as C,ba as D,Ca as E,vi as F,Ti as M,Ei as N,Hi as O,Ci as P,Ea as S,xa as T,_o as _,xo as a,ka as b,Oo as c,No as d,Ao as f,vo as g,ro as h,Co as i,ji as j,Ki as k,wo as l,yo as m,Po as n,Mo as o,Do as p,Lo as r,So as s,Fo as t,ko as u,to as v,ma as w,Ta as x,qa as y};