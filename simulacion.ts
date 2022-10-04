async function main() {
  const TF = 3155760; // one year
  const ci_arr: SimulacionArgs[] = [
    {
      cantRunners: 1,
      cantEstaciones: 20,
      tiempoRunneada: 30,
    },
    {
      cantRunners: 2,
      cantEstaciones: 20,
      tiempoRunneada: 30,
    },
    {
      cantRunners: 3,
      cantEstaciones: 20,
      tiempoRunneada: 30,
    },
    {
      cantRunners: 4,
      cantEstaciones: 20,
      tiempoRunneada: 30,
    },
    {
      cantRunners: 5,
      cantEstaciones: 20,
      tiempoRunneada: 30,
    },
    {
      cantRunners: 6,
      cantEstaciones: 20,
      tiempoRunneada: 30,
    },
    {
      cantRunners: 7,
      cantEstaciones: 20,
      tiempoRunneada: 30,
    },
    {
      cantRunners: 20,
      cantEstaciones: 20,
      tiempoRunneada: 30,
    },
  ];

  const promises: Promise<void>[] = [];
  ci_arr.forEach((ci) => {
    const promise: Promise<void> = new Promise((resolve) => {
      const res = new Simulacion(ci).simular(TF);
      console.log(res);
      resolve();
    });

    promises.push(promise);
  });

  await Promise.all(promises);
}

type SimulacionArgs = {
  cantRunners: number;
  cantEstaciones: number;
  tiempoRunneada: number;
};

class Simulacion {
  tpr: number[];
  ur: number[];
  ttor: number;

  tps: number[];
  us: number[];
  ttoe: number;

  tpm: number;
  cantRunners: number; // R
  cantEstaciones: number; // N
  numeroCubos: number; // NC
  numeroSoluciones: number; // NS
  tiempoRunneada: number; // TR
  t: number;

  tllr: number;
  cllr: number;
  ullr: number;

  constructor(args: SimulacionArgs) {
    this.numeroCubos = 0;
    this.numeroSoluciones = 0;
    this.cantRunners = args.cantRunners;
    this.cantEstaciones = args.cantEstaciones;
    this.tiempoRunneada = args.tiempoRunneada;

    this.tpr = Array(args.cantRunners).fill(Number.MAX_SAFE_INTEGER);
    this.ur = Array(args.cantRunners).fill(0);
    this.ttor = 0;

    this.tps = Array(args.cantEstaciones).fill(Number.MAX_SAFE_INTEGER);
    this.us = Array(args.cantEstaciones).fill(0);
    this.ttoe = 0;

    this.tpm = 0;
    this.t = 0;

    this.tllr = 0;
    this.cllr = 0;
    this.ullr = 0;
  }

  idxMenorTPR() {
    let ret = 0;

    for (let i = 1; i < this.tpr.length; i++) {
      if (this.tpr[ret] > this.tpr[i]) {
        ret = i;
      }
    }

    return ret;
  }

  idxMenorTPS() {
    let ret = 0;

    for (let i = 1; i < this.tps.length; i++) {
      if (this.tps[ret] > this.tps[i]) {
        ret = i;
      }
    }

    return ret;
  }

  idxRunnerLibre(): number {
    // const res = this.tpr.findIndex((n) => n === Number.MAX_SAFE_INTEGER);
    const res = this.tpr
      .map((elem, index) => (elem === Number.MAX_SAFE_INTEGER ? index : -1))
      .filter((e) => e !== -1);
    // return res === -1 ? null : res;
    return res[Math.floor(Math.random() * res.length)];
  }

  idxEstacionLibre(): number {
    // const res = this.tps.findIndex((n) => n === Number.MAX_SAFE_INTEGER);
    const res = this.tps
      .map((elem, index) => (elem === Number.MAX_SAFE_INTEGER ? index : -1))
      .filter((e) => e !== -1);
    // return res === -1 ? null : res;
    return res[Math.floor(Math.random() * res.length)];
    // return res === -1 ? null : res;
  }

  simular(tf: number) {
    while (this.t < tf) {
      this.iteracion();
    }

    const tpe = this.tllr / this.cllr;
    const ptor = (100 * this.ttor) / this.t / this.cantRunners;
    const ptoe = (100 * this.ttoe) / this.t / this.cantEstaciones;

    return {
      tpe: tpe,
      r: this.cantRunners,
      n: this.cantEstaciones,
      ptor: ptor,
      ptoe: ptoe,
      ttoe: this.ttoe,
      t: this.t,
    };
  }

  iteracion() {
    const idxMinTPR = this.idxMenorTPR();
    const idxMinTPS = this.idxMenorTPS();

    if (this.tpm <= this.tpr[idxMinTPR] && this.tpm <= this.tps[idxMinTPS]) {
      this.eventoMezcla();
    } else {
      if (this.tpr[idxMinTPR] < this.tps[idxMinTPS]) {
        this.eventoRunneada(idxMinTPR);
      } else {
        this.eventoSolucion(idxMinTPS);
      }
    }
  }

  eventoMezcla() {
    this.t = this.tpm;
    const im = this.generateIM();
    this.tpm = this.t + im;
    this.numeroCubos++;

    if (this.numeroCubos <= this.cantRunners) {
      const idx = this.idxRunnerLibre();
      this.ttor = this.ttor + (this.t - this.ur[idx]);
      this.tpr[idx] = this.t + this.tiempoRunneada;
    }
  }

  eventoRunneada(idx: number) {
    this.t = this.tpr[idx];

    this.numeroCubos--;
    this.numeroSoluciones++;

    if (this.numeroSoluciones <= this.cantEstaciones) {
      const ts = this.generateTS();

      const idxEstacionLibre = this.idxEstacionLibre();
      this.ttoe = this.ttoe + (this.t - this.us[idxEstacionLibre]);

      this.tps[idxEstacionLibre] = this.t + ts;

      this.tllr += this.t - this.ullr;
      this.cllr++;
      this.ullr = this.t;
    }

    if (this.numeroCubos >= this.cantRunners) {
      this.tpr[idx] = this.t + 2 * this.tiempoRunneada;
    } else {
      this.ur[idx] = this.t;
      this.tpr[idx] = Number.MAX_SAFE_INTEGER;
    }
  }

  eventoSolucion(idx: number) {
    this.t = this.tps[idx];
    this.numeroSoluciones--;

    if (this.numeroSoluciones >= this.cantEstaciones) {
      const ts = this.generateTS();
      this.tps[idx] = this.t + ts;

      this.tllr += this.t - this.ullr;
      this.cllr++;
      this.ullr = this.t;
    } else {
      this.us[idx] = this.t;
      this.tps[idx] = Number.MAX_SAFE_INTEGER;
    }
  }

  generateIM(): number {
    return 5 + Math.random() * 5;
  }

  generateTS(): number {
    const m = 0.025;

    while (true) {
      const x = 30 + Math.random() * 60;
      const y = m * Math.random();

      if (
        (x <= 60 && y <= (1 / 2550) * x) ||
        (x > 60 && y <= (-2 / 3825) * x + 14 / 225)
      ) {
        return x;
      }
    }
  }
}

main();
